import uuid
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.timeutils import today_local
from app.crud import gamification, target_logic
from app.models.target import Target
from app.models.target_template import TargetTemplate
from app.models.user import User
from app.schemas.target import (
    UNIT_TO_BASE,
    TargetCreate,
    TargetFromTemplateCreate,
    TargetProgress,
    TargetResponse,
    TargetUpdate,
)

FINAL_STATUSES = ("selesai", "dibatalkan")
OPEN_STATUSES = ("draft", "aktif")
MAX_DURATION_DAYS = 365


class TargetError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class InvalidTarget(TargetError):
    pass


class DuplicateTarget(TargetError):
    pass


class TemplateNotFound(TargetError):
    pass


# ---------- Template ----------
def list_templates(
    db: Session, category: str | None = None, difficulty: str | None = None
) -> list[TargetTemplate]:
    stmt = select(TargetTemplate)
    if category:
        stmt = stmt.where(TargetTemplate.category == category)
    if difficulty:
        stmt = stmt.where(TargetTemplate.difficulty == difficulty)
    stmt = stmt.order_by(TargetTemplate.category, TargetTemplate.target_value)
    return list(db.scalars(stmt))


# ---------- Helper ----------
def _resolve_dates(start_date: date | None, duration_days: int) -> tuple[date, date, date]:
    today = today_local()
    start = start_date or today
    if start < today:
        raise InvalidTarget("Tanggal mulai tidak boleh sebelum hari ini.")
    end = start + timedelta(days=duration_days - 1)  # end_date inklusif (FR-25)
    return start, end, today


def _has_open_duplicate(
    db: Session,
    user_id: uuid.UUID,
    *,
    template_id: uuid.UUID | None = None,
    name: str | None = None,
    exclude_id: uuid.UUID | None = None,
) -> bool:
    stmt = (
        select(func.count())
        .select_from(Target)
        .where(Target.user_id == user_id, Target.status.in_(OPEN_STATUSES))
    )
    if template_id is not None:
        stmt = stmt.where(Target.template_id == template_id)
    if name is not None:
        stmt = stmt.where(func.lower(Target.name) == name.lower())
    if exclude_id is not None:
        stmt = stmt.where(Target.id != exclude_id)
    return (db.scalar(stmt) or 0) > 0


# ---------- Create ----------
def create_from_template(
    db: Session, user: User, data: TargetFromTemplateCreate
) -> Target:
    tpl = db.get(TargetTemplate, data.template_id)
    if tpl is None:
        raise TemplateNotFound("Template target tidak ditemukan.")

    start, end, today = _resolve_dates(data.start_date, data.duration_days)
    if _has_open_duplicate(db, user.id, template_id=tpl.id):
        raise DuplicateTarget("Target dari template ini masih berjalan.")

    target = Target(
        user_id=user.id,
        template_id=tpl.id,
        name=tpl.name,
        description=tpl.description,
        category=tpl.category,
        target_value=tpl.target_value,
        unit=tpl.unit,
        frequency=data.frequency or tpl.frequency,
        start_date=start,
        end_date=end,
        status="aktif" if start <= today else "draft",
    )
    db.add(target)
    db.flush()
    db.refresh(target)
    return target


def create_manual(db: Session, user: User, data: TargetCreate) -> Target:
    start, end, today = _resolve_dates(data.start_date, data.duration_days)
    if _has_open_duplicate(db, user.id, name=data.name):
        raise DuplicateTarget("Sudah ada target berjalan dengan nama yang sama.")

    target = Target(
        user_id=user.id,
        template_id=None,
        name=data.name,
        description=data.description,
        category=data.category,
        target_value=data.target_value,
        unit=data.unit,
        frequency=data.frequency,
        start_date=start,
        end_date=end,
        status="aktif" if start <= today else "draft",
    )
    db.add(target)
    db.flush()
    db.refresh(target)
    return target


# ---------- Read ----------
def get_target(db: Session, user_id: uuid.UUID, target_id: uuid.UUID) -> Target | None:
    return db.scalars(
        select(Target).where(Target.id == target_id, Target.user_id == user_id)
    ).first()


def _decide_status(target: Target, res: target_logic.ProgressResult, today: date) -> str:
    if res.all_met:
        return "selesai"
    if today > target.end_date:
        return "terlewat"
    if target.start_date <= today:
        return "aktif"
    return "draft"


def build_response(db: Session, user: User, target: Target) -> TargetResponse:
    """Hitung progres real-time, sinkronkan status (lazy), lalu bentuk response."""
    today = today_local()
    base = target_logic.to_base(target.target_value, target.unit)
    daily = target_logic.daily_sums(
        db, user.id, target.category, target.start_date, target.end_date
    )
    res = target_logic.evaluate(
        daily, base, target.frequency, target.start_date, target.end_date, today
    )

    if target.status not in FINAL_STATUSES:
        new_status = _decide_status(target, res, today)
        if new_status != target.status:
            target.status = new_status
            if new_status == "selesai":
                user.total_points += target_logic.FULL_TARGET_POINTS
                db.flush()
                gamification.award_new_badges(db, user)
            db.flush()

    factor = UNIT_TO_BASE.get(target.unit, Decimal("1"))
    out = TargetResponse.model_validate(target)
    out.progress = TargetProgress(
        realized=(res.realized / factor).quantize(Decimal("0.01")),
        target_value=target.target_value,
        percentage=res.percentage,
        completed=res.period_completed,
        periods_met=res.periods_met,
        periods_total=res.periods_total,
    )
    return out


def list_target_responses(
    db: Session,
    user: User,
    status_filter: str | None,
    category: str | None,
    limit: int,
    offset: int,
) -> list[TargetResponse]:
    stmt = select(Target).where(Target.user_id == user.id)
    if category:
        stmt = stmt.where(Target.category == category)
    stmt = stmt.order_by(Target.created_at.desc())

    responses = [build_response(db, user, t) for t in db.scalars(stmt).all()]
    if status_filter:
        responses = [r for r in responses if r.status == status_filter]
    return responses[offset : offset + limit]


# ---------- Update / cancel / delete ----------
def update_target(db: Session, target: Target, data: TargetUpdate) -> Target:
    if target.status not in OPEN_STATUSES:
        raise InvalidTarget("Hanya target berstatus draft atau aktif yang dapat diubah.")

    changes = data.model_dump(exclude_unset=True)
    for required in ("name", "target_value", "frequency", "end_date"):
        if required in changes and changes[required] is None:
            changes.pop(required)

    end = changes.get("end_date", target.end_date)
    if end < target.start_date:
        raise InvalidTarget("Tanggal selesai tidak boleh sebelum tanggal mulai.")
    if end < today_local():
        raise InvalidTarget("Tanggal selesai tidak boleh sebelum hari ini.")
    if (end - target.start_date).days + 1 > MAX_DURATION_DAYS:
        raise InvalidTarget(f"Durasi target maksimal {MAX_DURATION_DAYS} hari.")
    if "name" in changes and _has_open_duplicate(
        db, target.user_id, name=changes["name"], exclude_id=target.id
    ):
        raise DuplicateTarget("Sudah ada target berjalan dengan nama yang sama.")

    for field, value in changes.items():
        setattr(target, field, value)
    db.flush()
    return target


def cancel_target(db: Session, target: Target) -> Target:
    if target.status not in OPEN_STATUSES:
        raise InvalidTarget("Hanya target berstatus draft atau aktif yang dapat dibatalkan.")
    target.status = "dibatalkan"
    db.flush()
    return target


def delete_target(db: Session, target: Target) -> None:
    db.delete(target)
    db.commit()