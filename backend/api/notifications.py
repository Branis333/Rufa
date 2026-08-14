from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from api.dependencies import get_current_user
from core.exceptions import ForbiddenError, NotFoundError
from core.pagination import decode_cursor
from models.user import User
from repositories.domain import DomainRepository, get_domain_repository
from schemas.activity import NotificationResponse
from schemas.common import MessageResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=list[NotificationResponse])
def list_notifications(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    unread_only: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    cursor: str | None = None,
) -> list[dict]:
    filters: dict[str, object] = {"user_id": str(user.user_id)}
    if unread_only:
        filters["is_read"] = False
    return repository.list(
        "notifications",
        filters=filters,
        limit=limit,
        cursor_field="created_at",
        cursor=decode_cursor(cursor),
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def read_notification(
    notification_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    row = repository.get("notifications", "notification_id", str(notification_id))
    if row is None:
        raise NotFoundError("Notification not found.")
    if row["user_id"] != str(user.user_id):
        raise ForbiddenError("This notification belongs to another user.")
    return repository.update(
        "notifications",
        "notification_id",
        str(notification_id),
        {"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()},
    )


@router.post("/read-all", response_model=MessageResponse)
def read_all_notifications(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> MessageResponse:
    repository.update_where(
        "notifications",
        filters={"user_id": str(user.user_id), "is_read": False},
        data={"is_read": True, "read_at": datetime.now(timezone.utc).isoformat()},
    )
    return MessageResponse(message="All notifications marked as read.")
