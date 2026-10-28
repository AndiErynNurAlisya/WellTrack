from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.user import User
from app.schemas.auth import RegisterRequest
from app.schemas.user import UserUpdate


class EmailAlreadyRegistered(Exception):
    pass


# Hash palsu: login dengan email yang tidak ada tetap melewati proses bcrypt,
# sehingga waktu responsnya tidak membocorkan apakah email terdaftar.
_DUMMY_HASH = hash_password("dummy-password-for-timing")


def get_by_email(db: Session, email: str) -> User | None:
    return db.scalars(select(User).where(User.email == email.lower())).first()


def create_user(db: Session, data: RegisterRequest) -> User:
    if get_by_email(db, data.email):
        raise EmailAlreadyRegistered

    user = User(
        name=data.name,
        email=data.email.lower(),
        password_hash=hash_password(data.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise EmailAlreadyRegistered
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User | None:
    user = get_by_email(db, email)
    if user is None:
        verify_password(password, _DUMMY_HASH)
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user


def update_profile(db: Session, user: User, data: UserUpdate) -> User:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def change_password(
    db: Session, user: User, old_password: str, new_password: str
) -> bool:
    if not verify_password(old_password, user.password_hash):
        return False
    user.password_hash = hash_password(new_password)
    db.commit()
    return True