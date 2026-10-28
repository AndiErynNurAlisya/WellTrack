from datetime import time

from app.crud.reminder import normalize_time


def test_detik_dibuang():
    assert normalize_time(time(7, 0, 45, 123)) == time(7, 0)


def test_menit_tetap():
    assert normalize_time(time(22, 30)) == time(22, 30)