from decimal import Decimal

from app.crud.water_log import to_ml


def test_konversi_ml():
    assert to_ml(Decimal("250"), "ml") == Decimal("250")


def test_konversi_liter():
    assert to_ml(Decimal("1.5"), "l") == Decimal("1500.0")


def test_konversi_gelas():
    assert to_ml(Decimal("2"), "gelas") == Decimal("500")