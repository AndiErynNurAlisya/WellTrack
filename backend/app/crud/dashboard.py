import uuid
from datetime import date
from typing import Literal, Sequence

from sqlalchemy import Numeric, cast, func, literal_column, select, union_all
from sqlalchemy.orm import Session

from app.core.timeutils import today_local
from app.crud import gamification
from app.crud import target as target_crud
from app.crud import water_log as water_crud
from app.models.activity_log import ActivityLog
from app.models.badge import Badge
from app.models.sleep_log import SleepLog
from app.models.target import Target
from app.models.user import User
from app.models.user_badge import UserBadge
from app.models.water_log import WaterLog
from app.schemas.dashboard import (
    ActivitySummary,
    DashboardResponse,
    HistoryItem,
    HistoryResponse,
    WaterSummary,
)
from app.schemas.gamification import BadgeResponse
from app.schemas.sleep_log import SleepLogResponse

HistoryType = Literal["aktivitas", "air", "tidur"]
ALL_TYPES: tuple[str, ...] = ("aktivitas", "air", "tidur")
RECENT_BADGES = 3


def _recent_badges(db: Session, user_id: uuid.UUID) -> list[BadgeResponse]:
    rows = db.execute(
        select(Badge, UserBadge.earned_at)
        .join(UserBadge, UserBadge.badge_id == Badge.id)
        .where(UserBadge.user_id == user_id)
        .order_by(UserBadge.earned_at.desc())
        .limit(RECENT_BADGES)
    ).all()
    return [gamification._badge_response(badge, earned_at) for badge, earned_at in rows]


def get_dashboard(db: Session, user: User) -> DashboardResponse:
    today = today_local()

    act_total, act_count = db.execute(
        select(func.coalesce(func.sum(ActivityLog.duration_minutes), 0), func.count()).where(
            ActivityLog.user_id == user.id, ActivityLog.activity_date == today
        )
    ).one()

    water = water_crud.get_daily_total(db, user.id, today)

    last_sleep = db.scalars(
        select(SleepLog)
        .where(SleepLog.user_id == user.id)
        .order_by(SleepLog.sleep_end.desc())
        .limit(1)
    ).first()

    # Target dihitung lebih dulu: status/poin bisa berubah (lazy) sebelum dibaca di bawah
    open_targets = db.scalars(
        select(Target)
        .where(Target.user_id == user.id, Target.status.in_(("draft", "aktif")))
        .order_by(Target.end_date)
    ).all()
    responses = [target_crud.build_response(db, user, t) for t in open_targets]
    active_targets = [r for r in responses if r.status == "aktif"]

    return DashboardResponse(
        today=today,
        activity_today=ActivitySummary(total_minutes=int(act_total), count=act_count),
        water_today=WaterSummary(total_ml=water.total_ml, count=water.entries),
        last_sleep=SleepLogResponse.model_validate(last_sleep) if last_sleep else None,
        active_targets=active_targets,
        total_points=user.total_points,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        last_log_date=user.last_log_date,
        recent_badges=_recent_badges(db, user.id),
    )


def _apply_range(stmt, column, date_from: date | None, date_to: date | None):
    if date_from is not None:
        stmt = stmt.where(column >= date_from)
    if date_to is not None:
        stmt = stmt.where(column <= date_to)
    return stmt


def list_history(
    db: Session,
    user_id: uuid.UUID,
    types: Sequence[str],
    date_from: date | None,
    date_to: date | None,
    limit: int,
    offset: int,
) -> HistoryResponse:
    parts = []

    if "aktivitas" in types:
        q = select(
            literal_column("'aktivitas'").label("type"),
            ActivityLog.id.label("id"),
            ActivityLog.activity_date.label("log_date"),
            ActivityLog.activity_type.label("title"),
            cast(ActivityLog.duration_minutes, Numeric(12, 2)).label("value"),
            literal_column("'menit'").label("unit"),
            ActivityLog.created_at.label("created_at"),
        ).where(ActivityLog.user_id == user_id)
        parts.append(_apply_range(q, ActivityLog.activity_date, date_from, date_to))

    if "air" in types:
        q = select(
            literal_column("'air'").label("type"),
            WaterLog.id.label("id"),
            WaterLog.log_date.label("log_date"),
            literal_column("'Minum air'").label("title"),
            cast(water_crud._ML_EXPR, Numeric(12, 2)).label("value"),
            literal_column("'ml'").label("unit"),
            WaterLog.created_at.label("created_at"),
        ).where(WaterLog.user_id == user_id)
        parts.append(_apply_range(q, WaterLog.log_date, date_from, date_to))

    if "tidur" in types:
        q = select(
            literal_column("'tidur'").label("type"),
            SleepLog.id.label("id"),
            SleepLog.sleep_date.label("log_date"),
            literal_column("'Tidur'").label("title"),
            cast(SleepLog.duration_minutes, Numeric(12, 2)).label("value"),
            literal_column("'menit'").label("unit"),
            SleepLog.created_at.label("created_at"),
        ).where(SleepLog.user_id == user_id)
        parts.append(_apply_range(q, SleepLog.sleep_date, date_from, date_to))

    if not parts:
        return HistoryResponse(items=[], total=0, limit=limit, offset=offset)

    sub = union_all(*parts).subquery("history")
    total = db.scalar(select(func.count()).select_from(sub)) or 0
    rows = db.execute(
        select(sub)
        .order_by(sub.c.log_date.desc(), sub.c.created_at.desc())
        .limit(limit)
        .offset(offset)
    ).all()

    items = [
        HistoryItem(
            type=r.type,
            id=r.id,
            log_date=r.log_date,
            title=r.title,
            value=float(r.value),
            unit=r.unit,
        )
        for r in rows
    ]
    return HistoryResponse(items=items, total=total, limit=limit, offset=offset)