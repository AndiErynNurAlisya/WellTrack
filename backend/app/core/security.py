import uuid
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from jwt import InvalidTokenError

from app.core.config import settings

MAX_BCRYPT_BYTES = 72


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")
    if len(pw) > MAX_BCRYPT_BYTES:
        raise ValueError("Kata sandi maksimal 72 byte.")
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, password_hash: str) -> bool:
    pw = plain_password.encode("utf-8")
    if len(pw) > MAX_BCRYPT_BYTES:
        return False
    try:
        return bcrypt.checkpw(pw, password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(
    user_id: uuid.UUID, expires_delta: timedelta | None = None
) -> str:
    now = datetime.now(timezone.utc)
    expire = now + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {"sub": str(user_id), "iat": now, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> uuid.UUID | None:
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
        return uuid.UUID(payload["sub"])
    except (InvalidTokenError, KeyError, ValueError):
        return None