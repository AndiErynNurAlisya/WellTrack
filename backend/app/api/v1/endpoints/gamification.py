from fastapi import APIRouter

from app.core.dependencies import CurrentUser, DbSession
from app.crud import gamification as crud
from app.schemas.gamification import BadgeResponse, GamificationSummary

router = APIRouter(prefix="/gamification", tags=["Gamification"])


@router.get("/summary", response_model=GamificationSummary)
def get_summary(db: DbSession, current_user: CurrentUser):
    return crud.get_summary(db, current_user)


@router.get("/badges", response_model=list[BadgeResponse])
def list_badges(db: DbSession, current_user: CurrentUser, earned: bool | None = None):
    return crud.list_badges(db, current_user, earned)