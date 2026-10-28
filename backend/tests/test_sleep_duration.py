from datetime import date, time

import pytest

from app.crud.sleep_log import InvalidSleepTime, compute_sleep_window

D = date(2026, 10, 20)


def test_tidur_melewati_tengah_malam():
    start, end, minutes = compute_sleep_window(D, time(23, 0), time(7, 0))
    assert minutes == 480
    assert end.date() == date(2026, 10, 21)
    assert start.date() == D


def test_tidak_melewati_tengah_malam():
    _, end, minutes = compute_sleep_window(D, time(0, 30), time(6, 0))
    assert minutes == 330
    assert end.date() == D


def test_durasi_sangat_pendek():
    assert compute_sleep_window(D, time(23, 59), time(0, 1))[2] == 2


def test_jam_sama_ditolak():
    with pytest.raises(InvalidSleepTime):
        compute_sleep_window(D, time(22, 30), time(22, 30))


def test_durasi_terlalu_panjang_ditolak():
    with pytest.raises(InvalidSleepTime):
        compute_sleep_window(D, time(12, 0), time(11, 0))  # 23 jam