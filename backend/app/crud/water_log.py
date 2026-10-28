import uuid
from datetime import date
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session
from app.crud import gamification
from app.schemas.gamification import GamificationResult
from app.models.user import User
from app.models.water_log import WaterLog
from app.schemas.water_log import (
    MAX_ENTRY_ML,
    UNIT_TO_ML,
    WaterDailyTotal,
    WaterLogCreate,
    WaterLogUpdate,
)

NULLABLE_FIELDS = {"notes"}

# Ekspresi SQL: ubah setiap baris ke ml, lalu dijumlah di database (FR-11)
_ML_EXPR = case(
    *[(WaterLog.unit == unit, WaterLog.amount * factor) for unit, factor in UNIT_TO_ML.items()],
    else_=0,
)


class InvalidWaterAmount(Exception):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def to_ml(amount: Decimal, unit: str) -> Decimal:
    """Fungsi murni: konversi ke mililiter."""
    return Decimal(amount) * UNIT_TO_ML[unit]


def create_water_log(
    db: Session, user: User, data: WaterLogCreate
) -> tuple[WaterLog, GamificationResult]:
    log = WaterLog(
        user_id=user.id,
        log_date=data.log_date,
        log_time=data.log_time,
        amount=data.amount,
        unit=data.unit,
        notes=data.notes,
    )
    db.add(log)
    db.flush()
    result = gamification.process_new_log(
        db, user, "air", data.log_date, to_ml(data.amount, data.unit)
    )
    db.commit()
    db.refresh(log)
    return log, result


def get_water_log(db: Session, user_id: uuid.UUID, log_id: uuid.UUID) -> WaterLog | None:
    return db.scalars(
        select(WaterLog).where(WaterLog.id == log_id, WaterLog.user_id == user_id)
    ).first()


def list_water_logs(
    db: Session,
    user_id: uuid.UUID,
    date_from: date | None,
    date_to: date | None,
    limit: int,
    offset: int,
) -> list[WaterLog]:
    stmt = select(WaterLog).where(WaterLog.user_id == user_id)
    if date_from is not None:
        stmt = stmt.where(WaterLog.log_date >= date_from)
    if date_to is not None:
        stmt = stmt.where(WaterLog.log_date <= date_to)
    stmt = (
        stmt.order_by(WaterLog.log_date.desc(), WaterLog.log_time.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(db.scalars(stmt))


def get_daily_total(db: Session, user_id: uuid.UUID, log_date: date) -> WaterDailyTotal:
    total, entries = db.execute(
        select(func.coalesce(func.sum(_ML_EXPR), 0), func.count()).where(
            WaterLog.user_id == user_id, WaterLog.log_date == log_date
        )
    ).one()
    return WaterDailyTotal(log_date=log_date, total_ml=Decimal(total), entries=entries)


def update_water_log(db: Session, log: WaterLog, data: WaterLogUpdate) -> WaterLog:
    changes = {
        k: v
        for k, v in data.model_dump(exclude_unset=True).items()
        if v is not None or k in NULLABLE_FIELDS
    }

    amount = changes.get("amount", log.amount)
    unit = changes.get("unit", log.unit)
    if to_ml(amount, unit) > MAX_ENTRY_ML:
        raise InvalidWaterAmount("Satu catatan air maksimal setara 5.000 ml.")

    for field, value in changes.items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return log


def delete_water_log(db: Session, log: WaterLog) -> None:
    db.delete(log)
    db.commit()