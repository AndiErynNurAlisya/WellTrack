from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.dependencies import CurrentUser, DbSession
from app.core.security import create_access_token
from app.crud import user as user_crud
from app.schemas.auth import (
    ChangePasswordRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.common import MessageResponse
from app.schemas.user import UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: DbSession):
    try:
        return user_crud.create_user(db, payload)
    except user_crud.EmailAlreadyRegistered:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email sudah terdaftar. Silakan login atau gunakan email lain.",
        )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: DbSession):
    user = user_crud.authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email atau kata sandi salah.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenResponse(
        access_token=create_access_token(user.id),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/logout", response_model=MessageResponse)
def logout(current_user: CurrentUser):
    # JWT stateless: token dihapus di sisi client (NFR-07).
    return MessageResponse(detail="Logout berhasil. Hapus token dari penyimpanan client.")


@router.post("/change-password", response_model=MessageResponse)
def change_password(payload: ChangePasswordRequest, db: DbSession, current_user: CurrentUser):
    ok = user_crud.change_password(
        db, current_user, payload.old_password, payload.new_password
    )
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Kata sandi lama tidak sesuai.",
        )
    return MessageResponse(detail="Kata sandi berhasil diubah.")