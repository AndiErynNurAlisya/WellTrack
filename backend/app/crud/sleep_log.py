import uuid
from datetime import date, datetime, time, timedelta

from decimal import Decimal
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.crud import gamification
from app.schemas.gamification import GamificationResult
from app.core.timeutils import APP_TZ
from app.models.sleep_log import SleepLog
from app.models.user import User
from app.schemas.sleep_log import SleepLogCreate, SleepLogUpdate

MAX_SLEEP_MINUTES = 20 * 60  # batas wajar; di atas ini dianggap salah input


class InvalidSleepTime(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


class SleepOverlap(Exception):
    pass


def compute_sleep_window(
    sleep_date: date, start_time: time, end_time: time
) -> tuple[datetime, datetime, int]:
    """Fungsi murni (tanpa database) untuk FR-15.

    sleep_date = tanggal MULAI tidur. Jika jam bangun <= jam tidur,
    waktu bangun jatuh di hari berikutnya (tidur melewati tengah malam).
    """
    if start_time == end_time:
        raise InvalidSleepTime("Waktu tidur dan waktu bangun tidak boleh sama.")

    start = datetime.combine(sleep_date, start_time, tzinfo=APP_TZ)
    end = datetime.combine(sleep_date, end_time, tzinfo=APP_TZ)
    if end <= start:
        end += timedelta(days=1)

    minutes = int((end - start).total_seconds() // 60)
    if minutes > MAX_SLEEP_MINUTES:
        raise InvalidSleepTime(
            f"Durasi tidur melebihi {MAX_SLEEP_MINUTES // 60} jam. Periksa kembali jam tidur dan bangun."
        )
    return start, end, minutes


def _has_overlap(
    db: Session,
    user_id: uuid.UUID,
    start: datetime,
    end: datetime,
    exclude_id: uuid.UUID | None = None,
) -> bool:
    stmt = (
        select(func.count())
        .select_from(SleepLog)
        .where(
            SleepLog.user_id == user_id,
            SleepLog.sleep_start < end,
            SleepLog.sleep_end > start,
        )
    )
    if exclude_id is not None:
        stmt = stmt.where(SleepLog.id != exclude_id)
    return (db.scalar(stmt) or 0) > 0


def create_sleep_log(
    db: Session, user: User, data: SleepLogCreate
) -> tuple[SleepLog, GamificationResult]:
    start, end, minutes = compute_sleep_window(
        data.sleep_date, data.sleep_start_time, data.sleep_end_time
    )
    if _has_overlap(db, user.id, start, end):
        raise SleepOverlap

    log = SleepLog(
        user_id=user.id,
        sleep_date=data.sleep_date,
        sleep_start=start,
        sleep_end=end,
        duration_minutes=minutes,
        quality=data.quality,
        notes=data.notes,
    )
    db.add(log)
    db.flush()
    result = gamification.process_new_log(
        db, user, "tidur", end.date(), Decimal(minutes)
    )
    db.commit()
    db.refresh(log)
    return log, result


def get_sleep_log(db: Session, user_id: uuid.UUID, log_id: uuid.UUID) -> SleepLog | None:
    return db.scalars(
        select(SleepLog).where(SleepLog.id == log_id, SleepLog.user_id == user_id)
    ).first()


def list_sleep_logs(
    db: Session,
    user_id: uuid.UUID,
    date_from: date | None,
    date_to: date | None,
    limit: int,
    offset: int,
) -> list[SleepLog]:
    stmt = select(SleepLog).where(SleepLog.user_id == user_id)
    if date_from is not None:
        stmt = stmt.where(SleepLog.sleep_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(SleepLog.sleep_date <= date_to)
    stmt = (
        stmt.order_by(SleepLog.sleep_date.desc(), SleepLog.sleep_start.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt))


def update_sleep_log(db: Session, log: SleepLog, data: SleepLogUpdate) -> SleepLog:
    changes = data.model_dump(exclude_unset=True)

    cur_start = log.sleep_start.astimezone(APP_TZ)
    cur_end = log.sleep_end.astimezone(APP_TZ)

    sleep_date = changes.get("sleep_date") or log.sleep_date
    start_time = changes.get("sleep_start_time") or cur_start.time()
    end_time = changes.get("sleep_end_time") or cur_end.time()

    start, end, minutes = compute_sleep_window(sleep_date, start_time, end_time)
    if _has_overlap(db, log.user_id, start, end, exclude_id=log.id):
        raise SleepOverlap

    log.sleep_date = sleep_date
    log.sleep_start = start
    log.sleep_end = end
    log.duration_minutes = minutes
    for field in ("quality", "notes"):
        if field in changes:
            setattr(log, field, changes[field])

    db.commit()
    db.refresh(log)
    return log


def delete_sleep_log(db: Session, log: SleepLog) -> None:
    db.delete(log)
    db.commit()