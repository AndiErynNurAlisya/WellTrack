from datetime import date

from app.crud.gamification import compute_streak

TODAY = date(2026, 10, 24)


def test_log_pertama():
    assert compute_streak(None, 0, 0, TODAY) == (1, 1)


def test_hari_yang_sama_tidak_berubah():
    assert compute_streak(TODAY, 3, 5, TODAY) == (3, 5)


def test_hari_berurutan_bertambah():
    assert compute_streak(date(2026, 10, 23), 3, 3, TODAY) == (4, 4)


def test_berurutan_menembus_rekor():
    assert compute_streak(date(2026, 10, 23), 6, 6, TODAY) == (7, 7)


def test_bolong_reset_rekor_tetap():
    assert compute_streak(date(2026, 10, 21), 9, 9, TODAY) == (1, 9)


def test_tanggal_terakhir_di_masa_depan_reset():
    assert compute_streak(date(2026, 10, 30), 4, 4, TODAY) == (1, 4)