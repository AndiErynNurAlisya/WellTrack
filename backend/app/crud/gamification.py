import uuid
from datetime import date, datetime, time, timedelta
from typing import Literal

from sqlalchemy import and_, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from decimal import Decimal

from app.crud import target_logic
from app.core.timeutils import APP_TZ, today_local
from app.models.activity_log import ActivityLog
from app.models.badge import Badge
from app.models.sleep_log import SleepLog
from app.models.target import Target
from app.models.user import User
from app.models.user_badge import UserBadge
from app.models.water_log import WaterLog
from app.schemas.gamification import (
    BadgeResponse,
    GamificationResult,
    GamificationSummary,
)

LogSource = Literal["aktivitas", "air", "tidur"]

POINTS_PER_LOG: dict[str, int] = {"aktivitas": 10, "air": 5, "tidur": 10}
MAX_REWARDED_LOGS_PER_DAY = 5  # per jenis log; di atas ini poin 0 (anti-curang)

LOG_MODELS = {"aktivitas": ActivityLog, "air": WaterLog, "tidur": SleepLog}


def compute_streak(
    last_log_date: date | None,
    current_streak: int,
    longest_streak: int,
    today: date,
) -> tuple[int, int]:
    """Fungsi murni (FR-37). Mengembalikan (current_streak, longest_streak)."""
    if last_log_date == today:
        current = max(current_streak, 1)
    elif last_log_date == today - timedelta(days=1):
        current = current_streak + 1
    else:
        current = 1
    return current, max(longest_streak, current)


def _count_logs_created_since(
    db: Session, user_id: uuid.UUID, source: str, since: datetime
) -> int:
    model = LOG_MODELS[source]
    return (
        db.scalar(
            select(func.count())
            .select_from(model)
            .where(model.user_id == user_id, model.created_at >= since)
        )
        or 0
    )


def count_total_logs(db: Session, user_id: uuid.UUID) -> int:
    total = 0
    for model in LOG_MODELS.values():
        total += (
            db.scalar(
                select(func.count()).select_from(model).where(model.user_id == user_id)
            )
            or 0
        )
    return total


def count_completed_targets(db: Session, user_id: uuid.UUID) -> int:
    return (
        db.scalar(
            select(func.count())
            .select_from(Target)
            .where(Target.user_id == user_id, Target.status == "selesai")
        )
        or 0
    )


def _points_for_log(db: Session, user: User, source: str, today: date) -> int:
    start_of_day = datetime.combine(today, time.min, tzinfo=APP_TZ)
    # log yang baru dibuat sudah di-flush, jadi ikut terhitung
    logs_today = _count_logs_created_since(db, user.id, source, start_of_day)
    if logs_today > MAX_REWARDED_LOGS_PER_DAY:
        return 0
    return POINTS_PER_LOG[source]


def _badge_response(
    badge: Badge, earned_at: datetime | None = None
) -> BadgeResponse:
    return BadgeResponse(
        id=badge.id,
        name=badge.name,
        description=badge.description,
        criteria_type=badge.criteria_type,
        criteria_value=badge.criteria_value,
        icon_url=badge.icon_url,
        earned=earned_at is not None,
        earned_at=earned_at,
    )


def _metric(db: Session, user: User, criteria_type: str, cache: dict) -> int:
    if criteria_type not in cache:
        if criteria_type == "streak":
            cache[criteria_type] = user.current_streak
        elif criteria_type == "total_logs":
            cache[criteria_type] = count_total_logs(db, user.id)
        elif criteria_type == "target_completed":
            cache[criteria_type] = count_completed_targets(db, user.id)
        else:
            cache[criteria_type] = 0
    return cache[criteria_type]


def award_new_badges(db: Session, user: User) -> list[BadgeResponse]:
    earned_ids = select(UserBadge.badge_id).where(UserBadge.user_id == user.id)
    candidates = db.scalars(
        select(Badge)
        .where(Badge.id.not_in(earned_ids))
        .order_by(Badge.criteria_type, Badge.criteria_value)
    ).all()

    cache: dict[str, int] = {}
    awarded: list[BadgeResponse] = []
    for badge in candidates:
        if _metric(db, user, badge.criteria_type, cache) < badge.criteria_value:
            continue
        user_badge = UserBadge(user_id=user.id, badge_id=badge.id)
        try:
            with db.begin_nested():  # savepoint: konflik tidak membatalkan log
                db.add(user_badge)
                db.flush()
        except IntegrityError:
            continue  # badge sudah dicatat oleh request lain
        db.refresh(user_badge)
        awarded.append(_badge_response(badge, user_badge.earned_at))
    return awarded


def process_new_log(
    db: Session, user: User, source: LogSource, log_day: date, amount_base: Decimal
) -> GamificationResult:
    """Dipanggil setelah log baru di-flush dan SEBELUM commit (satu transaksi).
    log_day = tanggal log; amount_base = menit (aktivitas, tidur) atau ml (air)."""
    db.refresh(user, with_for_update=True)  # kunci baris user: cegah balapan request

    today = today_local()
    points = _points_for_log(db, user, source, today)

    current, longest = compute_streak(
        user.last_log_date, user.current_streak, user.longest_streak, today
    )
    user.current_streak = current
    user.longest_streak = longest
    user.last_log_date = today

    reward = target_logic.apply_log_rewards(
        db, user.id, source, log_day, amount_base, today
    )
    total_earned = points + reward.period_points + reward.full_points
    user.total_points += total_earned
    db.flush()

    new_badges = award_new_badges(db, user)

    return GamificationResult(
        points_earned=total_earned,
        total_points=user.total_points,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        new_badges=new_badges,
    )


def list_badges(
    db: Session, user: User, earned: bool | None = None
) -> list[BadgeResponse]:
    rows = db.execute(
        select(Badge, UserBadge.earned_at)
        .outerjoin(
            UserBadge,
            and_(UserBadge.badge_id == Badge.id, UserBadge.user_id == user.id),
        )
        .order_by(Badge.criteria_type, Badge.criteria_value)
    ).all()
    result = [_badge_response(badge, earned_at) for badge, earned_at in rows]
    if earned is not None:
        result = [b for b in result if b.earned == earned]
    return result


def get_summary(db: Session, user: User) -> GamificationSummary:
    return GamificationSummary(
        total_points=user.total_points,
        current_streak=user.current_streak,
        longest_streak=user.longest_streak,
        last_log_date=user.last_log_date,
        badges=list_badges(db, user),
    )