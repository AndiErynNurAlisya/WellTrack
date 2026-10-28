from datetime import date, timedelta
from decimal import Decimal
from typing import Literal

from sqlalchemy.orm import Session

from app.core.timeutils import today_local
from app.crud import target_logic
from app.models.user import User
from app.schemas.dashboard import ChartPeriod, ChartPoint, ChartResponse, ChartSeries

ChartMetric = Literal["aktivitas", "air", "tidur"]
Bucket = tuple[date, date, str]  # (mulai, selesai, label)

MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]

# kunci -> (nama, satuan, mode agregasi)
SERIES_DEF: dict[str, tuple[str, str, str]] = {
    "aktivitas": ("Aktivitas fisik", "menit", "sum"),
    "air": ("Konsumsi air", "ml", "sum"),
    "tidur": ("Durasi tidur (rata-rata per hari)", "menit", "avg"),
}


def _add_months(d: date, n: int) -> date:
    year, month = divmod(d.year * 12 + d.month - 1 + n, 12)
    return date(year, month + 1, 1)


def build_buckets(period: str, today: date) -> list[Bucket]:
    """Fungsi murni. harian = 7 hari terakhir, mingguan = 8 minggu terakhir
    (Senin-Minggu), bulanan = 6 bulan kalender terakhir."""
    if period == "harian":
        days = [today - timedelta(days=i) for i in range(6, -1, -1)]
        return [(d, d, f"{d.day} {MONTHS[d.month - 1]}") for d in days]

    if period == "mingguan":
        monday = today - timedelta(days=today.weekday())
        out: list[Bucket] = []
        for i in range(7, -1, -1):
            s = monday - timedelta(weeks=i)
            out.append((s, s + timedelta(days=6), f"{s.day} {MONTHS[s.month - 1]}"))
        return out

    first = today.replace(day=1)
    out = []
    for i in range(5, -1, -1):
        s = _add_months(first, -i)
        e = _add_months(s, 1) - timedelta(days=1)
        out.append((s, e, f"{MONTHS[s.month - 1]} {s.year}"))
    return out


def bucketize(
    daily: dict[date, Decimal], buckets: list[Bucket], mode: str
) -> list[Decimal]:
    """Fungsi murni. sum = total per bucket; avg = rata-rata per hari yang punya data."""
    values: list[Decimal] = []
    for start, end, _ in buckets:
        in_range = [v for d, v in daily.items() if start <= d <= end]
        if not in_range:
            values.append(Decimal(0))
        elif mode == "avg":
            values.append(sum(in_range, Decimal(0)) / len(in_range))
        else:
            values.append(sum(in_range, Decimal(0)))
    return values


def get_chart(
    db: Session, user: User, period: ChartPeriod, metric: ChartMetric | None = None
) -> ChartResponse:
    today = today_local()
    buckets = build_buckets(period, today)
    start, end = buckets[0][0], buckets[-1][1]
    fetch_end = min(end, today)

    series: list[ChartSeries] = []
    for key in [metric] if metric else list(SERIES_DEF):
        name, unit, mode = SERIES_DEF[key]
        daily = target_logic.daily_sums(db, user.id, key, start, fetch_end)
        values = bucketize(daily, buckets, mode)
        points = [
            ChartPoint(label=label, period_start=s, value=float(round(v, 1)))
            for (s, _, label), v in zip(buckets, values)
        ]
        series.append(ChartSeries(name=name, unit=unit, points=points))

    has_data = any(p.value > 0 for s in series for p in s.points)
    return ChartResponse(
        period=period,
        start_date=start,
        end_date=end,
        series=series,
        has_data=has_data,
        message=None if has_data else "Data belum tersedia.",
    )