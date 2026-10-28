import uuid
from datetime import date
from typing import Literal

from pydantic import BaseModel

from app.schemas.common import DecimalNum
from app.schemas.gamification import BadgeResponse
from app.schemas.sleep_log import SleepLogResponse
from app.schemas.target import TargetResponse

ChartPeriod = Literal["harian", "mingguan", "bulanan"]


class ActivitySummary(BaseModel):
    total_minutes: int
    count: int


class WaterSummary(BaseModel):
    total_ml: DecimalNum
    count: int


class DashboardResponse(BaseModel):
    today: date
    activity_today: ActivitySummary
    water_today: WaterSummary
    last_sleep: SleepLogResponse | None
    active_targets: list[TargetResponse]
    total_points: int
    current_streak: int
    longest_streak: int
    last_log_date: date | None
    recent_badges: list[BadgeResponse]


class HistoryItem(BaseModel):
    type: Literal["aktivitas", "air", "tidur"]
    id: uuid.UUID
    log_date: date
    title: str
    value: float
    unit: str


class HistoryResponse(BaseModel):
    items: list[HistoryItem]
    total: int
    limit: int
    offset: int


class ChartPoint(BaseModel):
    label: str
    period_start: date
    value: float


class ChartSeries(BaseModel):
    name: str
    unit: str
    points: list[ChartPoint]


class ChartResponse(BaseModel):
    period: ChartPeriod
    start_date: date
    end_date: date
    series: list[ChartSeries]
    has_data: bool
    message: str | None = None  # "Data belum tersedia" (FR-22)