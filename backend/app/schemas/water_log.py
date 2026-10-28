import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.timeutils import today_local
from app.schemas.common import DecimalNum, Notes
from app.schemas.gamification import GamificationResult

WaterUnit = Literal["ml", "l", "gelas"]

# Faktor konversi ke ml (dipakai juga oleh crud untuk menjumlah total harian)
UNIT_TO_ML: dict[str, Decimal] = {
    "ml": Decimal("1"),
    "l": Decimal("1000"),
    "gelas": Decimal("250"),
}
MAX_ENTRY_ML = Decimal("5000")


def _not_future(v: date | None) -> date | None:
    if v is not None and v > today_local():
        raise ValueError("Tanggal tidak boleh di masa depan.")
    return v


class WaterLogCreate(BaseModel):
    log_date: date
    log_time: time
    amount: Decimal = Field(gt=0, le=Decimal("9999.99"), decimal_places=2)
    unit: WaterUnit = "ml"
    notes: Notes | None = None

    _check_date = field_validator("log_date")(_not_future)

    @model_validator(mode="after")
    def check_max_entry(self):
        if self.amount * UNIT_TO_ML[self.unit] > MAX_ENTRY_ML:
            raise ValueError("Satu catatan air maksimal setara 5.000 ml.")
        return self


class WaterLogUpdate(BaseModel):
    log_date: date | None = None
    log_time: time | None = None
    amount: Decimal | None = Field(
        default=None, gt=0, le=Decimal("9999.99"), decimal_places=2
    )
    unit: WaterUnit | None = None
    notes: Notes | None = None

    _check_date = field_validator("log_date")(_not_future)


class WaterLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    log_date: date
    log_time: time
    amount: DecimalNum
    unit: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


class WaterDailyTotal(BaseModel):
    log_date: date
    total_ml: DecimalNum
    entries: int


class WaterLogCreateResponse(BaseModel):
    data: WaterLogResponse
    daily_total: WaterDailyTotal
    gamification: GamificationResult