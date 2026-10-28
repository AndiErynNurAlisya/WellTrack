import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.dependencies import CurrentUser, DbSession
from app.crud import sleep_log as crud
from app.schemas.sleep_log import (
    SleepLogCreate,
    SleepLogCreateResponse,
    SleepLogResponse,
    SleepLogUpdate,
)

router = APIRouter(prefix="/sleep-logs", tags=["Sleep Logs"])

NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Catatan tidur tidak ditemukan."
)
OVERLAP = HTTPException(
    status_code=status.HTTP_409_CONFLICT,
    detail="Waktu tidur bertabrakan dengan catatan tidur lain.",
)


@router.post("", response_model=SleepLogCreateResponse, status_code=status.HTTP_201_CREATED)
def create_sleep_log(payload: SleepLogCreate, db: DbSession, current_user: CurrentUser):
    try:
        log, result = crud.create_sleep_log(db, current_user, payload)
    except crud.InvalidSleepTime as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except crud.SleepOverlap:
        raise OVERLAP
    return SleepLogCreateResponse(
        data=SleepLogResponse.model_validate(log), gamification=result
    )


@router.get("", response_model=list[SleepLogResponse])
def list_sleep_logs(
    db: DbSession,
    current_user: CurrentUser,
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
    return crud.list_sleep_logs(db, current_user.id, date_from, date_to, limit, offset)


@router.get("/{log_id}", response_model=SleepLogResponse)
def get_sleep_log(log_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    log = crud.get_sleep_log(db, current_user.id, log_id)
    if log is None:
        raise NOT_FOUND
    return log


@router.patch("/{log_id}", response_model=SleepLogResponse)
def update_sleep_log(
    log_id: uuid.UUID, payload: SleepLogUpdate, db: DbSession, current_user: CurrentUser
):
    log = crud.get_sleep_log(db, current_user.id, log_id)
    if log is None:
        raise NOT_FOUND
    try:
        return crud.update_sleep_log(db, log, payload)
    except crud.InvalidSleepTime as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)
    except crud.SleepOverlap:
        raise OVERLAP


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sleep_log(log_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    log = crud.get_sleep_log(db, current_user.id, log_id)
    if log is None:
        raise NOT_FOUND
    crud.delete_sleep_log(db, log)
    return Response(status_code=status.HTTP_204_NO_CONTENT)