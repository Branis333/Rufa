from datetime import datetime
from uuid import UUID

from pydantic import Field

from schemas.common import CamelModel


class ConversationCreate(CamelModel):
    commitment_id: UUID


class ConversationResponse(CamelModel):
    conversation_id: UUID
    request_id: UUID
    commitment_id: UUID
    requester_id: UUID
    donor_id: UUID
    created_at: datetime
    last_message_preview: str | None = None
    last_message_at: datetime | None = None


class MessageCreate(CamelModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageResponse(CamelModel):
    message_id: UUID
    conversation_id: UUID
    sender_id: UUID
    body: str
    sent_at: datetime
    read_at: datetime | None = None
