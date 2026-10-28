from datetime import date

from fastapi import APIRouter, HTTPException, Query, status

from app.core.dependencies import CurrentUser, DbSession
from app.crud import dashboard as crud
from app.schemas.dashboard import DashboardResponse, HistoryResponse

router = APIRouter(tags=["Dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
def read_dashboard(db: DbSession, current_user: CurrentUser):
    result = crud.get_dashboard(db, current_user)
    db.commit()  # status target bisa berubah saat dibaca (lazy)
    return result


@router.get("/history", response_model=HistoryResponse)
def read_history(
    db: DbSession,
    current_user: CurrentUser,
    log_type: crud.HistoryType | None = Query(None, alias="type"),
    date_from: date | None = None,
    date_to: date | None = None,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from tidak boleh setelah date_to.",
        )
    types = (log_type,) if log_type else crud.ALL_TYPES
    return crud.list_history(db, current_user.id, types, date_from, date_to, limit, offset)