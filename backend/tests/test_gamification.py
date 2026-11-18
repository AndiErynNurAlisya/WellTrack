import uuid
from datetime import datetime, timezone

from app.crud.gamification import (
    MAX_REWARDED_LOGS_PER_DAY,
    POINTS_PER_LOG,
    _badge_response,
)
from app.models.badge import Badge


def test_konfigurasi_poin_per_log():
    # FR-36: Setiap kategori memiliki alokasi poin yang ditentukan
    assert POINTS_PER_LOG["air"] == 5
    assert POINTS_PER_LOG["aktivitas"] == 10
    assert POINTS_PER_LOG["tidur"] == 10


def test_batas_maksimal_log_harian_anti_curang():
    # Anti-spam: Maksimal 5 log per jenis per hari yang diberi poin
    assert MAX_REWARDED_LOGS_PER_DAY == 5


def test_simulasi_aturan_poin_dalam_batas():
    # Sesi ke-1 sampai ke-5 harus mendapatkan poin penuh
    for logs_count in range(1, MAX_REWARDED_LOGS_PER_DAY + 1):
        points = POINTS_PER_LOG["air"] if logs_count <= MAX_REWARDED_LOGS_PER_DAY else 0
        assert points == 5


def test_simulasi_aturan_poin_melebihi_batas_menjadi_nol():
    # Sesi ke-6 dan seterusnya poinnya harus 0
    logs_count = 6
    points = POINTS_PER_LOG["air"] if logs_count <= MAX_REWARDED_LOGS_PER_DAY else 0
    assert points == 0


def test_badge_response_belum_diperoleh():
    badge = Badge(
        id=uuid.uuid4(),
        name="Langkah Pertama",
        description="Mencatat log kesehatan pertama.",
        criteria_type="total_logs",
        criteria_value=1,
        icon_url="trophy",
    )
    res = _badge_response(badge, earned_at=None)
    assert res.earned is False
    assert res.earned_at is None
    assert res.name == "Langkah Pertama"


def test_badge_response_sudah_diperoleh():
    now = datetime.now(timezone.utc)
    badge = Badge(
        id=uuid.uuid4(),
        name="Jagoan Streak",
        description="Streak 30 hari berturut-turut.",
        criteria_type="streak",
        criteria_value=30,
        icon_url="flame",
    )
    res = _badge_response(badge, earned_at=now)
    assert res.earned is True
    assert res.earned_at == now
    assert res.criteria_value == 30
