import uuid
from datetime import time

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderUpdate

MAX_REMINDERS_PER_USER = 20


class ReminderError(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class DuplicateReminder(ReminderError):
    pass


class ReminderLimitReached(ReminderError):
    pass


def normalize_time(t: time) -> time:
    """Pengingat bekerja per menit: detik dan mikrodetik dibuang."""
    return t.replace(second=0, microsecond=0, tzinfo=None)


def _has_duplicate(
    db: Session,
    user_id: uuid.UUID,
    reminder_type: str,
    reminder_time: time,
    exclude_id: uuid.UUID | None = None,
) -> bool:
    stmt = (
        select(func.count())
        .select_from(Reminder)
        .where(
            Reminder.user_id == user_id,
            Reminder.reminder_type == reminder_type,
            Reminder.reminder_time == reminder_time,
        )
    )
    if exclude_id is not None:
        stmt = stmt.where(Reminder.id != exclude_id)
    return (db.scalar(stmt) or 0) > 0


def create_reminder(db: Session, user: User, data: ReminderCreate) -> Reminder:
    count = db.scalar(
        select(func.count()).select_from(Reminder).where(Reminder.user_id == user.id)
    ) or 0
    if count >= MAX_REMINDERS_PER_USER:
        raise ReminderLimitReached(
            f"Jumlah pengingat maksimal {MAX_REMINDERS_PER_USER} per pengguna."
        )

    rtime = normalize_time(data.reminder_time)
    if _has_duplicate(db, user.id, data.reminder_type, rtime):
        raise DuplicateReminder("Pengingat dengan jenis dan jam yang sama sudah ada.")

    reminder = Reminder(
        user_id=user.id,
        reminder_type=data.reminder_type,
        reminder_time=rtime,
        frequency=data.frequency,
        is_active=data.is_active,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder


def get_reminder(
    db: Session, user_id: uuid.UUID, reminder_id: uuid.UUID
) -> Reminder | None:
    return db.scalars(
        select(Reminder).where(Reminder.id == reminder_id, Reminder.user_id == user_id)
    ).first()


def list_reminders(
    db: Session,
    user_id: uuid.UUID,
    is_active: bool | None,
    reminder_type: str | None,
) -> list[Reminder]:
    stmt = select(Reminder).where(Reminder.user_id == user_id)
    if is_active is not None:
        stmt = stmt.where(Reminder.is_active == is_active)
    if reminder_type:
        stmt = stmt.where(Reminder.reminder_type == reminder_type)
    stmt = stmt.order_by(Reminder.reminder_time, Reminder.reminder_type)
    return list(db.scalars(stmt))


def update_reminder(db: Session, reminder: Reminder, data: ReminderUpdate) -> Reminder:
    changes = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if "reminder_time" in changes:
        changes["reminder_time"] = normalize_time(changes["reminder_time"])

    new_type = changes.get("reminder_type", reminder.reminder_type)
    new_time = changes.get("reminder_time", reminder.reminder_time)
    if _has_duplicate(db, reminder.user_id, new_type, new_time, exclude_id=reminder.id):
        raise DuplicateReminder("Pengingat dengan jenis dan jam yang sama sudah ada.")

    for field, value in changes.items():
        setattr(reminder, field, value)
    db.commit()
    db.refresh(reminder)
    return reminder


def toggle_reminder(db: Session, reminder: Reminder) -> Reminder:
    reminder.is_active = not reminder.is_active
    db.commit()
    db.refresh(reminder)
    return reminder


def delete_reminder(db: Session, reminder: Reminder) -> None:
    db.delete(reminder)
    db.commit()