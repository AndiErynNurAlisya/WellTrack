from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DbSession
from app.crud import user as user_crud
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
def read_me(current_user: CurrentUser):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_me(payload: UserUpdate, db: DbSession, current_user: CurrentUser):
    return user_crud.update_profile(db, current_user, payload)