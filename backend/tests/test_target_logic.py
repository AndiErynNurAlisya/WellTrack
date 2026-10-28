from datetime import date
from decimal import Decimal

from app.crud.target_logic import build_periods, evaluate, to_base

D = Decimal


def test_to_base():
    assert to_base(D("1.5"), "l") == D("1500")
    assert to_base(D("2"), "jam") == D("120")
    assert to_base(D("3"), "gelas") == D("750")
    assert to_base(D("10"), "satuan-asing") == D("10")


def test_periode_harian():
    assert len(build_periods(date(2026, 10, 1), date(2026, 10, 3), "harian")) == 3


def test_periode_mingguan_blok_terakhir_terpotong():
    assert build_periods(date(2026, 10, 1), date(2026, 10, 10), "mingguan") == [
        (date(2026, 10, 1), date(2026, 10, 7)),
        (date(2026, 10, 8), date(2026, 10, 10)),
    ]


def test_harian_tercapai_dan_dibatasi_100():
    daily = {date(2026, 10, 20): D(30), date(2026, 10, 21): D(45)}
    r = evaluate(daily, D(30), "harian", date(2026, 10, 20), date(2026, 10, 22), date(2026, 10, 21))
    assert r.realized == D(45)
    assert r.percentage == 100.0
    assert r.period_completed is True
    assert (r.periods_met, r.periods_total, r.all_met) == (2, 3, False)


def test_semua_periode_tercapai():
    daily = {date(2026, 10, d): D(30) for d in (20, 21, 22)}
    r = evaluate(daily, D(30), "harian", date(2026, 10, 20), date(2026, 10, 22), date(2026, 10, 22))
    assert r.all_met is True


def test_progres_sebagian():
    daily = {date(2026, 10, 20): D(135)}
    r = evaluate(daily, D(150), "harian", date(2026, 10, 20), date(2026, 10, 20), date(2026, 10, 20))
    assert r.percentage == 90.0
    assert r.period_completed is False


def test_belum_mulai_dan_sudah_lewat():
    before = evaluate({}, D(30), "harian", date(2026, 10, 25), date(2026, 10, 27), date(2026, 10, 24))
    assert (before.realized, before.percentage) == (D(0), 0.0)
    after = evaluate({date(2026, 10, 27): D(30)}, D(30), "harian", date(2026, 10, 25), date(2026, 10, 27), date(2026, 11, 5))
    assert after.period_completed is True  # periode terakhir


def test_mingguan():
    daily = {date(2026, 10, 2): D(100), date(2026, 10, 5): D(60), date(2026, 10, 9): D(150)}
    r = evaluate(daily, D(150), "mingguan", date(2026, 10, 1), date(2026, 10, 14), date(2026, 10, 9))
    assert r.realized == D(150)
    assert (r.periods_met, r.periods_total, r.all_met) == (2, 2, True)