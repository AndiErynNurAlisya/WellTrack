import uuid
from datetime import date

from decimal import Decimal
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.crud import gamification
from app.schemas.gamification import GamificationResult
from app.models.activity_log import ActivityLog
from app.models.user import User
from app.schemas.activity_log import ActivityLogCreate, ActivityLogUpdate

NULLABLE_FIELDS = {"notes"}


def create_activity_log(
    db: Session, user: User, data: ActivityLogCreate
) -> tuple[ActivityLog, GamificationResult]:
    log = ActivityLog(
        user_id=user.id,
        activity_type=data.activity_type,
        activity_date=data.activity_date,
        duration_minutes=data.duration_minutes,
        intensity=data.intensity,
        notes=data.notes,
    )
    db.add(log)
    db.flush()
    result = gamification.process_new_log(
        db, user, "aktivitas", data.activity_date, Decimal(data.duration_minutes)
    )
    db.commit()
    db.refresh(log)
    return log, result


def get_activity_log(
    db: Session, user_id: uuid.UUID, log_id: uuid.UUID
) -> ActivityLog | None:
    return db.scalars(
        select(ActivityLog).where(
            ActivityLog.id == log_id, ActivityLog.user_id == user_id
        )
    ).first()


def list_activity_logs(
    db: Session,
    user_id: uuid.UUID,
    date_from: date | None,
    date_to: date | None,
    activity_type: str | None,
    limit: int,
    offset: int,
) -> list[ActivityLog]:
    stmt = select(ActivityLog).where(ActivityLog.user_id == user_id)
    if date_from is not None:
        stmt = stmt.where(ActivityLog.activity_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(ActivityLog.activity_date <= date_to)
    if activity_type:
        stmt = stmt.where(ActivityLog.activity_type.ilike(f"%{activity_type}%"))
    stmt = (
        stmt.order_by(ActivityLog.activity_date.desc(), ActivityLog.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt))


def update_activity_log(
    db: Session, log: ActivityLog, data: ActivityLogUpdate
) -> ActivityLog:
    for field, value in data.model_dump(exclude_unset=True).items():
        if value is None and field not in NULLABLE_FIELDS:
            continue  # kolom wajib tidak boleh dikosongkan
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log


def delete_activity_log(db: Session, log: ActivityLog) -> None:
    db.delete(log)
    db.commit()