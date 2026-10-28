from datetime import date, datetime
from zoneinfo import ZoneInfo

from app.core.config import settings

APP_TZ = ZoneInfo(settings.APP_TIMEZONE)


def now_local() -> datetime:
    """Waktu sekarang di zona waktu aplikasi (bukan UTC server)."""
    return datetime.now(APP_TZ)


def today_local() -> date:
    """Tanggal 'hari ini' menurut zona waktu aplikasi."""
    return now_local().date()
