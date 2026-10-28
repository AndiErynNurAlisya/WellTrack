import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.dependencies import CurrentUser, DbSession
from app.crud import activity_log as crud
from app.schemas.activity_log import (
    ActivityLogCreate,
    ActivityLogCreateResponse,
    ActivityLogResponse,
    ActivityLogUpdate,
)

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])

NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Catatan aktivitas tidak ditemukan."
)


@router.post("", response_model=ActivityLogCreateResponse, status_code=status.HTTP_201_CREATED)
def create_activity_log(
    payload: ActivityLogCreate, db: DbSession, current_user: CurrentUser
):
    log, result = crud.create_activity_log(db, current_user, payload)
    return ActivityLogCreateResponse(
        data=ActivityLogResponse.model_validate(log), gamification=result
    )

@router.get("", response_model=list[ActivityLogResponse])
def list_activity_logs(
    db: DbSession,
    current_user: CurrentUser,
    date_from: date | None = None,
    date_to: date | None = None,
    activity_type: str | None = Query(None, max_length=100),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    if date_from and date_to and date_from > date_to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_from tidak boleh setelah date_to.",
        )
    return crud.list_activity_logs(
        db, current_user.id, date_from, date_to, activity_type, limit, offset
    )


@router.get("/{log_id}", response_model=ActivityLogResponse)
def get_activity_log(log_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    log = crud.get_activity_log(db, current_user.id, log_id)
    if log is None:
        raise NOT_FOUND
    return log


@router.patch("/{log_id}", response_model=ActivityLogResponse)
def update_activity_log(
    log_id: uuid.UUID,
    payload: ActivityLogUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    log = crud.get_activity_log(db, current_user.id, log_id)
    if log is None:
        raise NOT_FOUND
    return crud.update_activity_log(db, log, payload)


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_activity_log(log_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    log = crud.get_activity_log(db, current_user.id, log_id)
    if log is None:
        raise NOT_FOUND
    crud.delete_activity_log(db, log)
    return Response(status_code=status.HTTP_204_NO_CONTENT)