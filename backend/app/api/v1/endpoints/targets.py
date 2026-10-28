import uuid

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.dependencies import CurrentUser, DbSession
from app.crud import target as crud
from app.schemas.target import (
    Category,
    Difficulty,
    TargetCreate,
    TargetFromTemplateCreate,
    TargetResponse,
    TargetStatus,
    TargetTemplateResponse,
    TargetUpdate,
)

router = APIRouter(prefix="/targets", tags=["Targets"])

NOT_FOUND = HTTPException(
    status_code=status.HTTP_404_NOT_FOUND, detail="Target tidak ditemukan."
)


def _error(e: crud.TargetError) -> HTTPException:
    if isinstance(e, crud.TemplateNotFound):
        code = status.HTTP_404_NOT_FOUND
    elif isinstance(e, crud.DuplicateTarget):
        code = status.HTTP_409_CONFLICT
    else:
        code = status.HTTP_400_BAD_REQUEST
    return HTTPException(status_code=code, detail=e.message)


@router.get("/templates", response_model=list[TargetTemplateResponse])
def list_templates(
    db: DbSession,
    current_user: CurrentUser,
    category: Category | None = None,
    difficulty: Difficulty | None = None,
):
    return crud.list_templates(db, category, difficulty)


@router.post("/from-template", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
def create_from_template(
    payload: TargetFromTemplateCreate, db: DbSession, current_user: CurrentUser
):
    try:
        target = crud.create_from_template(db, current_user, payload)
    except crud.TargetError as e:
        raise _error(e)
    result = crud.build_response(db, current_user, target)
    db.commit()
    return result


@router.post("", response_model=TargetResponse, status_code=status.HTTP_201_CREATED)
def create_manual_target(payload: TargetCreate, db: DbSession, current_user: CurrentUser):
    try:
        target = crud.create_manual(db, current_user, payload)
    except crud.TargetError as e:
        raise _error(e)
    result = crud.build_response(db, current_user, target)
    db.commit()
    return result


@router.get("", response_model=list[TargetResponse])
def list_targets(
    db: DbSession,
    current_user: CurrentUser,
    status_filter: TargetStatus | None = Query(None, alias="status"),
    category: Category | None = None,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    result = crud.list_target_responses(
        db, current_user, status_filter, category, limit, offset
    )
    db.commit()
    return result


@router.get("/{target_id}", response_model=TargetResponse)
def get_target(target_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    target = crud.get_target(db, current_user.id, target_id)
    if target is None:
        raise NOT_FOUND
    result = crud.build_response(db, current_user, target)
    db.commit()
    return result


@router.patch("/{target_id}", response_model=TargetResponse)
def update_target(
    target_id: uuid.UUID, payload: TargetUpdate, db: DbSession, current_user: CurrentUser
):
    target = crud.get_target(db, current_user.id, target_id)
    if target is None:
        raise NOT_FOUND
    try:
        crud.update_target(db, target, payload)
    except crud.TargetError as e:
        raise _error(e)
    result = crud.build_response(db, current_user, target)
    db.commit()
    return result


@router.post("/{target_id}/cancel", response_model=TargetResponse)
def cancel_target(target_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    target = crud.get_target(db, current_user.id, target_id)
    if target is None:
        raise NOT_FOUND
    try:
        crud.cancel_target(db, target)
    except crud.TargetError as e:
        raise _error(e)
    result = crud.build_response(db, current_user, target)
    db.commit()
    return result


@router.delete("/{target_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_target(target_id: uuid.UUID, db: DbSession, current_user: CurrentUser):
    target = crud.get_target(db, current_user.id, target_id)
    if target is None:
        raise NOT_FOUND
    crud.delete_target(db, target)
    return Response(status_code=status.HTTP_204_NO_CONTENT)