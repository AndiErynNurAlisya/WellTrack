import uuid
from datetime import date, datetime, time
from typing import Literal

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.core.timeutils import today_local
from app.schemas.common import Notes
from app.schemas.gamification import GamificationResult

SleepQuality = Literal["buruk", "cukup", "baik"]


def _not_future(v: date | None) -> date | None:
    if v is not None and v > today_local():
        raise ValueError("Tanggal tidak boleh di masa depan.")
    return v


class SleepLogCreate(BaseModel):
    """sleep_date = tanggal MULAI tidur. Jam bangun lebih kecil atau sama
    dengan jam tidur dianggap hari berikutnya (dihitung di crud)."""

    sleep_date: date
    sleep_start_time: time
    sleep_end_time: time
    quality: SleepQuality | None = None
    notes: Notes | None = None

    _check_date = field_validator("sleep_date")(_not_future)

    @model_validator(mode="after")
    def times_not_equal(self):
        if self.sleep_start_time == self.sleep_end_time:
            raise ValueError("Waktu tidur dan waktu bangun tidak boleh sama.")
        return self


class SleepLogUpdate(BaseModel):
    sleep_date: date | None = None
    sleep_start_time: time | None = None
    sleep_end_time: time | None = None
    quality: SleepQuality | None = None
    notes: Notes | None = None

    _check_date = field_validator("sleep_date")(_not_future)

    @model_validator(mode="after")
    def times_not_equal(self):
        if (
            self.sleep_start_time is not None
            and self.sleep_end_time is not None
            and self.sleep_start_time == self.sleep_end_time
        ):
            raise ValueError("Waktu tidur dan waktu bangun tidak boleh sama.")
        return self


class SleepLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sleep_date: date
    sleep_start: datetime
    sleep_end: datetime
    duration_minutes: int
    quality: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime


class SleepLogCreateResponse(BaseModel):
    data: SleepLogResponse
    gamification: GamificationResult