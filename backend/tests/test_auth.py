import uuid
from datetime import timedelta

import pytest

from app.core.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_password,
)


def test_hash_password_berhasil():
    pw = "rahasia123"
    h = hash_password(pw)
    assert h != pw
    assert h.startswith("$2b$") or h.startswith("$2a$")


def test_hash_password_berbeda_salt():
    pw = "rahasia123"
    h1 = hash_password(pw)
    h2 = hash_password(pw)
    assert h1 != h2  # bcrypt menggunakan random salt yang unik setiap hash


def test_hash_password_melebihi_72_byte_error():
    pw_terlalu_panjang = "A" * 73
    with pytest.raises(ValueError, match="Kata sandi maksimal 72 byte."):
        hash_password(pw_terlalu_panjang)


def test_verify_password_benar():
    pw = "passwordKuat#2026"
    h = hash_password(pw)
    assert verify_password(pw, h) is True


def test_verify_password_salah():
    pw = "passwordKuat#2026"
    h = hash_password(pw)
    assert verify_password("passwordSalah#999", h) is False


def test_verify_password_panjang_mengembalikan_false():
    pw_terlalu_panjang = "B" * 80
    assert verify_password(pw_terlalu_panjang, "some_hash") is False


def test_create_dan_decode_token_sukses():
    user_id = uuid.uuid4()
    token = create_access_token(user_id=user_id)
    assert isinstance(token, str)

    decoded_id = decode_access_token(token)
    assert decoded_id == user_id


def test_decode_token_kadaluarsa_mengembalikan_none():
    user_id = uuid.uuid4()
    token_expired = create_access_token(
        user_id=user_id, expires_delta=timedelta(seconds=-1)
    )
    assert decode_access_token(token_expired) is None


def test_decode_token_rusak_mengembalikan_none():
    assert decode_access_token("token.palsu.acak123") is None
    assert decode_access_token("") is None
