import uuid
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import Date, case, cast, func, literal_column, select
from sqlalchemy.orm import Session

from app.core.timeutils import APP_TZ
from app.models.activity_log import ActivityLog
from app.models.sleep_log import SleepLog
from app.models.target import Target
from app.models.water_log import WaterLog
from app.schemas.target import UNIT_TO_BASE
from app.schemas.water_log import UNIT_TO_ML

PERIOD_POINTS = 20  # satu periode (hari / blok 7 hari) tercapai
FULL_TARGET_POINTS = 100  # seluruh periode target tercapai

_TZ_SQL = literal_column("'" + APP_TZ.key + "'")
_ML_EXPR = case(
    *[(WaterLog.unit == unit, WaterLog.amount * factor) for unit, factor in UNIT_TO_ML.items()],
    else_=0,
)


@dataclass(frozen=True)
class ProgressResult:
    realized: Decimal  # periode berjalan, satuan dasar (menit / ml)
    target_base: Decimal
    percentage: float
    period_completed: bool
    periods_met: int
    periods_total: int
    all_met: bool


@dataclass
class TargetReward:
    period_points: int = 0
    full_points: int = 0


def to_base(value: Decimal, unit: str) -> Decimal:
    return Decimal(value) * UNIT_TO_BASE.get(unit.lower(), Decimal("1"))


def build_periods(start: date, end: date, frequency: str) -> list[tuple[date, date]]:
    """harian = 1 hari per periode; mingguan = blok 7 hari dari start_date."""
    step = 1 if frequency == "harian" else 7
    periods: list[tuple[date, date]] = []
    cur = start
    while cur <= end:
        p_end = min(cur + timedelta(days=step - 1), end)
        periods.append((cur, p_end))
        cur = p_end + timedelta(days=1)
    return periods


def _sum_range(daily: dict[date, Decimal], start: date, end: date) -> Decimal:
    return sum((v for d, v in daily.items() if start <= d <= end), Decimal(0))


def evaluate(
    daily: dict[date, Decimal],
    target_base: Decimal,
    frequency: str,
    start: date,
    end: date,
    today: date,
) -> ProgressResult:
    """Fungsi murni (FR-28): progres = min(realisasi / target x 100, 100)."""
    periods = build_periods(start, end, frequency)
    focus = min(max(today, start), end)
    cur_idx = next(i for i, (s, e) in enumerate(periods) if s <= focus <= e)

    realized_per_period = [_sum_range(daily, s, e) for s, e in periods]
    met = sum(1 for r in realized_per_period if r >= target_base)
    realized = realized_per_period[cur_idx]
    pct = float(min(realized / target_base * 100, Decimal(100)))

    return ProgressResult(
        realized=realized,
        target_base=target_base,
        percentage=round(pct, 1),
        period_completed=realized >= target_base,
        periods_met=met,
        periods_total=len(periods),
        all_met=met == len(periods),
    )


def daily_sums(
    db: Session, user_id: uuid.UUID, category: str, start: date, end: date
) -> dict[date, Decimal]:
    """Realisasi per hari dalam satuan dasar. Tidur dihitung pada tanggal BANGUN."""
    if category == "aktivitas":
        day = ActivityLog.activity_date
        stmt = select(day, func.sum(ActivityLog.duration_minutes)).where(
            ActivityLog.user_id == user_id, day.between(start, end)
        )
    elif category == "air":
        day = WaterLog.log_date
        stmt = select(day, func.sum(_ML_EXPR)).where(
            WaterLog.user_id == user_id, day.between(start, end)
        )
    else:
        day = cast(func.timezone(_TZ_SQL, SleepLog.sleep_end), Date)
        stmt = select(day, func.sum(SleepLog.duration_minutes)).where(
            SleepLog.user_id == user_id, day.between(start, end)
        )
    stmt = stmt.group_by(literal_column("1"))
    return {d: Decimal(v) for d, v in db.execute(stmt)}


def apply_log_rewards(
    db: Session,
    user_id: uuid.UUID,
    category: str,
    log_day: date,
    amount_base: Decimal,
    today: date,
) -> TargetReward:
    """Dipanggil setelah log baru di-flush. Beri poin saat sebuah periode target
    baru tercapai (+20) dan saat seluruh periode tercapai (+100, status selesai)."""
    targets = db.scalars(
        select(Target).where(
            Target.user_id == user_id,
            Target.category == category,
            Target.status.in_(("draft", "aktif")),
            Target.start_date <= log_day,
            Target.end_date >= log_day,
        )
    ).all()

    reward = TargetReward()
    for t in targets:
        tb = to_base(t.target_value, t.unit)
        daily = daily_sums(db, user_id, t.category, t.start_date, t.end_date)

        p_start, p_end = next(
            p for p in build_periods(t.start_date, t.end_date, t.frequency)
            if p[0] <= log_day <= p[1]
        )
        after = _sum_range(daily, p_start, p_end)
        before = after - amount_base
        if before < tb <= after:
            reward.period_points += PERIOD_POINTS

        res = evaluate(daily, tb, t.frequency, t.start_date, t.end_date, today)
        if res.all_met:
            t.status = "selesai"
            reward.full_points += FULL_TARGET_POINTS
        elif t.status == "draft" and t.start_date <= today:
            t.status = "aktif"

    db.flush()
    return reward