import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.dependencies import CurrentUser, DbSession
from app.core.timeutils import today_local
from app.crud import water_log as crud
from app.schemas.water_log import (
    WaterDailyTotal,
    WaterLogCreate,
    WaterLogCreateResponse,
    WaterLogResponse,
    WaterLogUpdate,
)

router = APIRouter(prefix="/water-logs", tags=["Water Logs"])

NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Catatan air tidak ditemukan."
)


@router.post("", response_model=WaterLogCreateResponse, status_code=status.HTTP_201_CREATED)
def create_water_log(payload: WaterLogCreate, db: DbSession, current_user: CurrentUser):
    log, result = crud.create_water_log(db, current_user, payload)
    total = crud.get_daily_total(db, current_user.id, log.log_date)
    return WaterLogCreateResponse(
        data=WaterLogResponse.model_validate(log),
        daily_total=total,
        gamification=result,
    )

@router.get("", response_model=list[WaterLogResponse])
def list_water_logs(
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
    return crud.list_water_logs(db, current_user.id, date_from, date_to, limit, offset)


# Harus didefinisikan SEBELUM "/{log_id}" supaya tidak dianggap sebagai ID
@router.get("/daily-total", response_model=WaterDailyTotal)
def daily_total(
    db: DbSession, current_user: CurrentUser, log_date: date | None = None
):
    return crud.get_daily_total(db, current_user.id, log_date or today_local())


@router.get("/{log_id}", response_model=WaterLogResponse)
def get_water_log(log_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    log = crud.get_water_log(db, current_user.id, log_id)
    if log is None:
        raise NOT_FOUND
    return log


@router.patch("/{log_id}", response_model=WaterLogResponse)
def update_water_log(
    log_id: uuid.UUID, payload: WaterLogUpdate, db: DbSession, current_user: CurrentUser
):
    log = crud.get_water_log(db, current_user.id, log_id)
    if log is None:
        raise NOT_FOUND
    try:
        return crud.update_water_log(db, log, payload)
    except crud.InvalidWaterAmount as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=e.message)


@router.delete("/{log_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_water_log(log_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    log = crud.get_water_log(db, current_user.id, log_id)
    if log is None:
        raise NOT_FOUND
    crud.delete_water_log(db, log)
    return Response(status_code=status.HTTP_204_NO_CONTENT)