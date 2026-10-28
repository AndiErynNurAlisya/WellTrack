"""Pydantic schemas for WellTrack API."""
from app.schemas.activity_log import (
    ActivityLogCreate,
    ActivityLogCreateResponse,
    ActivityLogResponse,
    ActivityLogUpdate,
)
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    Token,
    TokenResponse,
)
from app.schemas.common import MessageResponse
from app.schemas.dashboard import (
    ActivitySummary,
    ChartPoint,
    ChartResponse,
    ChartSeries,
    DashboardResponse,
    HistoryItem,
    HistoryResponse,
    WaterSummary,
)
from app.schemas.gamification import (
    BadgeResponse,
    GamificationResult,
    GamificationSummary,
)
from app.schemas.reminder import (
    ReminderCreate,
    ReminderResponse,
    ReminderUpdate,
)
from app.schemas.sleep_log import (
    SleepLogCreate,
    SleepLogCreateResponse,
    SleepLogResponse,
    SleepLogUpdate,
)
from app.schemas.target import (
    TargetCreate,
    TargetFromTemplateCreate,
    TargetProgress,
    TargetResponse,
    TargetTemplateResponse,
    TargetUpdate,
)
from app.schemas.user import (
    UserResponse,
    UserUpdate,
)
from app.schemas.water_log import (
    WaterDailyTotal,
    WaterLogCreate,
    WaterLogCreateResponse,
    WaterLogResponse,
    WaterLogUpdate,
)

__all__ = [
    "ActivityLogCreate",
    "ActivityLogCreateResponse",
    "ActivityLogResponse",
    "ActivityLogUpdate",
    "ChangePasswordRequest",
    "LoginRequest",
    "RegisterRequest",
    "Token",
    "TokenResponse",
    "MessageResponse",
    "ActivitySummary",
    "ChartPoint",
    "ChartResponse",
    "ChartSeries",
    "DashboardResponse",
    "HistoryItem",
    "HistoryResponse",
    "WaterSummary",
    "BadgeResponse",
    "GamificationResult",
    "GamificationSummary",
    "ReminderCreate",
    "ReminderResponse",
    "ReminderUpdate",
    "SleepLogCreate",
    "SleepLogCreateResponse",
    "SleepLogResponse",
    "SleepLogUpdate",
    "TargetCreate",
    "TargetFromTemplateCreate",
    "TargetProgress",
    "TargetResponse",
    "TargetTemplateResponse",
    "TargetUpdate",
    "UserResponse",
    "UserUpdate",
    "WaterDailyTotal",
    "WaterLogCreate",
    "WaterLogCreateResponse",
    "WaterLogResponse",
    "WaterLogUpdate",
]
