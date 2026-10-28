from datetime import date
from decimal import Decimal

from app.crud.chart import bucketize, build_buckets

D = Decimal
TODAY = date(2026, 10, 24)  # Sabtu


def test_bucket_harian():
    b = build_buckets("harian", TODAY)
    assert len(b) == 7
    assert b[0][0] == date(2026, 10, 18)
    assert b[-1][:2] == (TODAY, TODAY)


def test_bucket_mingguan():
    b = build_buckets("mingguan", TODAY)
    assert len(b) == 8
    assert b[0][0] == date(2026, 8, 31)
    assert b[-1][:2] == (date(2026, 10, 19), date(2026, 10, 25))


def test_bucket_bulanan():
    b = build_buckets("bulanan", TODAY)
    assert len(b) == 6
    assert b[0][0] == date(2026, 5, 1)
    assert b[-1][:2] == (date(2026, 10, 1), date(2026, 10, 31))
    assert b[-1][2] == "Okt 2026"


def test_bucket_bulanan_lintas_tahun():
    b = build_buckets("bulanan", date(2026, 2, 10))
    assert b[0][0] == date(2025, 9, 1)
    assert b[-1][1] == date(2026, 2, 28)


def test_bucketize_sum():
    daily = {date(2026, 10, 20): D(30), date(2026, 10, 21): D(60)}
    b = [(date(2026, 10, 19), date(2026, 10, 25), "x")]
    assert bucketize(daily, b, "sum") == [D(90)]


def test_bucketize_avg_per_hari_ada_data():
    daily = {date(2026, 10, 20): D(30), date(2026, 10, 21): D(60)}
    b = [(date(2026, 10, 19), date(2026, 10, 25), "x")]
    assert bucketize(daily, b, "avg") == [D(45)]


def test_bucketize_kosong_bernilai_nol():
    b = [(date(2026, 10, 19), date(2026, 10, 25), "x")]
    assert bucketize({}, b, "sum") == [D(0)]
    assert bucketize({}, b, "avg") == [D(0)]