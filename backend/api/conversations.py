from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status

from api.dependencies import get_current_user
from core.enums import CommitmentStatus, NotificationType
from core.exceptions import ConflictError, ForbiddenError, NotFoundError
from core.pagination import decode_cursor
from core.realtime import realtime_hub
from models.user import User
from repositories.domain import DomainRepository, get_domain_repository
from schemas.common import MessageResponse as OperationResponse
from schemas.messaging import (
    ConversationCreate,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)

router = APIRouter(prefix="/conversations", tags=["Messaging"])


def _conversation(
    repository: DomainRepository, conversation_id: UUID, user_id: UUID
) -> dict:
    row = repository.get("conversations", "conversation_id", str(conversation_id))
    if row is None:
        raise NotFoundError("Conversation not found.")
    if str(user_id) not in {row["requester_id"], row["donor_id"]}:
        raise ForbiddenError("You are not a participant in this conversation.")
    return row


@router.post(
    "",
    response_model=ConversationResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_conversation(
    data: ConversationCreate,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    commitment = repository.get(
        "request_commitments", "commitment_id", str(data.commitment_id)
    )
    if commitment is None:
        raise NotFoundError("Commitment not found.")
    request = repository.get("blood_requests", "request_id", commitment["request_id"])
    if request is None:
        raise NotFoundError("Blood request not found.")
    if str(user.user_id) not in {
        request["requester_id"],
        commitment["donor_id"],
    }:
        raise ForbiddenError("Only request participants can start a conversation.")
    if commitment["status"] in {
        CommitmentStatus.DECLINED.value,
        CommitmentStatus.INELIGIBLE.value,
        CommitmentStatus.CANCELLED.value,
    }:
        raise ConflictError("This commitment cannot start a conversation.")
    existing = repository.get("conversations", "commitment_id", str(data.commitment_id))
    if existing:
        return existing
    return repository.insert(
        "conversations",
        {
            "request_id": request["request_id"],
            "commitment_id": str(data.commitment_id),
            "requester_id": request["requester_id"],
            "donor_id": commitment["donor_id"],
        },
    )


@router.get("", response_model=list[ConversationResponse])
def list_conversations(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> list[dict]:
    requester_rows = repository.list(
        "conversations",
        filters={"requester_id": str(user.user_id)},
        limit=limit,
    )
    donor_rows = repository.list(
        "conversations",
        filters={"donor_id": str(user.user_id)},
        limit=limit,
    )
    rows = {row["conversation_id"]: row for row in requester_rows + donor_rows}
    return sorted(rows.values(), key=lambda row: row["created_at"], reverse=True)[
        :limit
    ]


@router.get("/{conversation_id}/messages", response_model=list[MessageResponse])
def list_messages(
    conversation_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    cursor: str | None = None,
) -> list[dict]:
    _conversation(repository, conversation_id, user.user_id)
    rows = repository.list(
        "messages",
        filters={"conversation_id": str(conversation_id)},
        order_by="sent_at",
        limit=limit,
        cursor_field="sent_at",
        cursor=decode_cursor(cursor),
    )
    return list(reversed(rows))


@router.post(
    "/{conversation_id}/messages",
    response_model=MessageResponse,
    status_code=status.HTTP_201_CREATED,
)
def send_message(
    conversation_id: UUID,
    data: MessageCreate,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    conversation = _conversation(repository, conversation_id, user.user_id)
    message = repository.insert(
        "messages",
        {
            "conversation_id": str(conversation_id),
            "sender_id": str(user.user_id),
            "body": data.body.strip(),
        },
    )
    recipient_id = (
        conversation["donor_id"]
        if conversation["requester_id"] == str(user.user_id)
        else conversation["requester_id"]
    )
    repository.insert(
        "notifications",
        {
            "user_id": recipient_id,
            "type": NotificationType.CHAT_MESSAGE.value,
            "title": f"Message from {user.display_name or user.fname}",
            "message": data.body.strip()[:120],
            "payload": {"conversationId": str(conversation_id)},
        },
    )
    event = {"type": "message.created", "data": message}
    background_tasks.add_task(
        realtime_hub.broadcast, f"conversation:{conversation_id}", event
    )
    background_tasks.add_task(realtime_hub.broadcast, f"user:{recipient_id}", event)
    return message


@router.post("/{conversation_id}/read", response_model=OperationResponse)
def read_conversation(
    conversation_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> OperationResponse:
    _conversation(repository, conversation_id, user.user_id)
    messages = repository.list(
        "messages",
        filters={"conversation_id": str(conversation_id)},
        order_by="sent_at",
        limit=100,
    )
    read_at = datetime.now(timezone.utc).isoformat()
    for message in messages:
        if message["sender_id"] != str(user.user_id) and not message["read_at"]:
            repository.update(
                "messages",
                "message_id",
                message["message_id"],
                {"read_at": read_at},
            )
    return OperationResponse(message="Conversation marked as read.")
