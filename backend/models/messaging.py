from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class Conversation(BaseModel):
    conversation_id: UUID
    request_id: UUID
    commitment_id: UUID
    requester_id: UUID
    donor_id: UUID
    created_at: datetime


class ChatMessage(BaseModel):
    message_id: UUID
    conversation_id: UUID
    sender_id: UUID
    body: str
    sent_at: datetime
    read_at: datetime | None = None
