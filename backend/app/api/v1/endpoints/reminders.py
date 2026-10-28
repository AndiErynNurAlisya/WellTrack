import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.core.dependencies import CurrentUser, DbSession
from app.crud import reminder as crud
from app.schemas.reminder import (
    ReminderCreate,
    ReminderResponse,
    ReminderType,
    ReminderUpdate,
)

router = APIRouter(prefix="/reminders", tags=["Reminders"])

NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Pengingat tidak ditemukan."
)


def _error(e: crud.ReminderError) -> HTTPException:
    code = (
        status.HTTP_409_CONFLICT
        if isinstance(e, crud.DuplicateReminder)
        else status.HTTP_400_BAD_REQUEST
    )
    return HTTPException(status_code=code, detail=e.message)


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(payload: ReminderCreate, db: DbSession, current_user: CurrentUser):
    try:
        return crud.create_reminder(db, current_user, payload)
    except crud.ReminderError as e:
        raise _error(e)


@router.get("", response_model=list[ReminderResponse])
def list_reminders(
    db: DbSession,
    current_user: CurrentUser,
    is_active: bool | None = None,
    reminder_type: ReminderType | None = None,
):
    return crud.list_reminders(db, current_user.id, is_active, reminder_type)


@router.get("/{reminder_id}", response_model=ReminderResponse)
def get_reminder(reminder_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    reminder = crud.get_reminder(db, current_user.id, reminder_id)
    if reminder is None:
        raise NOT_FOUND
    return reminder


@router.patch("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: uuid.UUID,
    payload: ReminderUpdate,
    db: DbSession,
    current_user: CurrentUser,
):
    reminder = crud.get_reminder(db, current_user.id, reminder_id)
    if reminder is None:
        raise NOT_FOUND
    try:
        return crud.update_reminder(db, reminder, payload)
    except crud.ReminderError as e:
        raise _error(e)


@router.post("/{reminder_id}/toggle", response_model=ReminderResponse)
def toggle_reminder(reminder_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    reminder = crud.get_reminder(db, current_user.id, reminder_id)
    if reminder is None:
        raise NOT_FOUND
    return crud.toggle_reminder(db, reminder)


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(reminder_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    reminder = crud.get_reminder(db, current_user.id, reminder_id)
    if reminder is None:
        raise NOT_FOUND
    crud.delete_reminder(db, reminder)
    return Response(status_code=status.HTTP_204_NO_CONTENT)