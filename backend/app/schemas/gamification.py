import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class BadgeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    criteria_type: str
    criteria_value: int
    icon_url: str | None
    earned: bool = False
    earned_at: datetime | None = None


class GamificationResult(BaseModel):
    """Ringkasan yang dikirim setiap kali log baru berhasil disimpan."""

    points_earned: int
    total_points: int
    current_streak: int
    longest_streak: int
    new_badges: list[BadgeResponse] = []


class GamificationSummary(BaseModel):
    total_points: int
    current_streak: int
    longest_streak: int
    last_log_date: date | None
    badges: list[BadgeResponse]