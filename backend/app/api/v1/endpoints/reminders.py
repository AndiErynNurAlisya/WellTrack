import uuid

from fastapi import APIRouter, HTTPException, Response, status

from app.core.config import settings
from app.core.dependencies import CurrentUser, DbSession
from app.crud import reminder as crud
from app.schemas.reminder import (
    PushSubscriptionCreate,
    PushSubscriptionResponse,
    ReminderCreate,
    ReminderResponse,
    ReminderType,
    ReminderUpdate,
    VapidPublicKeyResponse,
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


# ==========================================
# WEB PUSH NOTIFICATION ENDPOINTS
# Harus ditempatkan sebelum route dinamis /{reminder_id}
# agar string seperti 'vapid-public-key' tidak dianggap sebagai UUID
# ==========================================

@router.get("/vapid-public-key", response_model=VapidPublicKeyResponse)
def get_vapid_public_key():
    return VapidPublicKeyResponse(public_key=settings.VAPID_PUBLIC_KEY)


@router.post("/subscribe", response_model=PushSubscriptionResponse, status_code=status.HTTP_201_CREATED)
def subscribe_push(
    payload: PushSubscriptionCreate,
    db: DbSession,
    current_user: CurrentUser,
):
    sub = crud.save_push_subscription(db, current_user.id, payload)
    return sub


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe_push(
    endpoint: str,
    db: DbSession,
    current_user: CurrentUser,
):
    crud.delete_push_subscription_by_endpoint(db, current_user.id, endpoint)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/test-push")
def test_push_notification(
    db: DbSession,
    current_user: CurrentUser,
):
    subs = crud.get_user_push_subscriptions(db, current_user.id)
    if not subs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Perangkat ini belum terdaftar untuk notifikasi push. Klik 'Aktifkan Notifikasi Latar Belakang' terlebih dahulu.",
        )
    sent_count = 0
    payload = {
        "title": "WellTrack: Tes Notifikasi Latar Belakang 🔔",
        "body": f"Halo {current_user.name}! Notifikasi latar belakang Anda berhasil aktif dan siap mengingatkan Anda.",
        "url": "/dashboard",
    }
    for s in subs:
        if crud.send_push_to_subscription(db, s, payload):
            sent_count += 1
    return {
        "status": "ok",
        "sent_count": sent_count,
        "detail": f"Berhasil mengirim notifikasi push ke {sent_count} perangkat.",
    }


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
