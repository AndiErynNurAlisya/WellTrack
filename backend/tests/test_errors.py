from fastapi.testclient import TestClient

from app.core.errors import format_error
from app.main import app

client = TestClient(app)
REGISTER = "/api/v1/auth/register"


def test_health():
    assert client.get("/health").json() == {"status": "ok"}


def test_register_kosong():
    r = client.post(REGISTER, json={})
    body = r.json()
    assert r.status_code == 422
    assert isinstance(body["detail"], str)
    assert {"field": "email", "message": "Email wajib diisi."} in body["errors"]


def test_konfirmasi_password_beda():
    r = client.post(REGISTER, json={
        "name": "A", "email": "a@b.com", "password": "12345678", "confirm_password": "87654321",
    })
    assert r.status_code == 422
    assert "Konfirmasi kata sandi tidak sama." in [e["message"] for e in r.json()["errors"]]


def test_email_tidak_valid():
    r = client.post(REGISTER, json={
        "name": "A", "email": "bukan-email", "password": "12345678", "confirm_password": "12345678",
    })
    assert r.status_code == 422
    assert "Format email tidak valid." in [e["message"] for e in r.json()["errors"]]


def test_literal():
    e = {"type": "literal_error", "loc": ("body", "intensity"), "msg": "x",
         "ctx": {"expected": "'rendah', 'sedang' or 'tinggi'"}}
    assert format_error(e) == {
        "field": "intensity",
        "message": "Intensitas harus salah satu dari: 'rendah', 'sedang' atau 'tinggi'.",
    }


def test_greater_than():
    e = {"type": "greater_than", "loc": ("body", "amount"), "msg": "x", "ctx": {"gt": 0}}
    assert format_error(e)["message"] == "Jumlah harus lebih besar dari 0."


def test_string_too_short():
    e = {"type": "string_too_short", "loc": ("body", "password"), "msg": "x", "ctx": {"min_length": 8}}
    assert format_error(e)["message"] == "Kata sandi minimal 8 karakter."


def test_value_error_kustom():
    e = {"type": "value_error", "loc": ("body", "password"),
         "msg": "Value error, Kata sandi maksimal 72 byte.", "ctx": {}}
    assert format_error(e)["message"] == "Kata sandi maksimal 72 byte."