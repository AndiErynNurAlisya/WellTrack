import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.core.timeutils import today_local
from app.schemas.common import Notes, ShortText
from app.schemas.gamification import GamificationResult

Intensity = Literal["rendah", "sedang", "tinggi"]


def _not_future(v: date | None) -> date | None:
    if v is not None and v > today_local():
        raise ValueError("Tanggal tidak boleh di masa depan.")
    return v


class ActivityLogCreate(BaseModel):
    activity_type: ShortText
    activity_date: date
    duration_minutes: int = Field(gt=0, le=1440)
    intensity: Intensity
    notes: Notes | None = None

    _check_date = field_validator("activity_date")(_not_future)


class ActivityLogUpdate(BaseModel):
    activity_type: ShortText | None = None
    activity_date: date | None = None
    duration_minutes: int | None = Field(default=None, gt=0, le=1440)
    intensity: Intensity | None = None
    notes: Notes | None = None

    _check_date = field_validator("activity_date")(_not_future)


class ActivityLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    activity_type: str
    activity_date: date
    duration_minutes: int
    intensity: str
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ActivityLogCreateResponse(BaseModel):
    data: ActivityLogResponse
    gamification: GamificationResult