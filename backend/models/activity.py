from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from core.enums import (
    ActivityCategory,
    ContributionStatus,
    NotificationType,
    VerificationStatus,
)


class Donation(BaseModel):
    donation_id: UUID
    commitment_id: UUID
    donor_id: UUID
    request_id: UUID
    hospital_id: UUID
    bags_donated: int
    lives_helped_estimate: int
    completed_at: datetime


class ActivityItem(BaseModel):
    activity_id: UUID
    user_id: UUID
    category: ActivityCategory
    status: str
    title: str
    subtitle: str | None = None
    bags: int = 0
    amount_cents: int | None = None
    occurred_at: datetime


class Notification(BaseModel):
    notification_id: UUID
    user_id: UUID
    type: NotificationType
    title: str
    message: str
    payload: dict[str, Any] = Field(default_factory=dict)
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime


class VerificationApplication(BaseModel):
    application_id: UUID
    user_id: UUID
    document_type: str
    document_reference: str
    selfie_reference: str | None = None
    status: VerificationStatus
    submitted_at: datetime
    reviewed_at: datetime | None = None
    reviewer_id: UUID | None = None
    review_notes: str | None = None


class Contribution(BaseModel):
    contribution_id: UUID
    user_id: UUID
    amount_cents: int
    currency: str
    provider: str
    status: ContributionStatus
    campaign_code: str
    created_at: datetime
    succeeded_at: datetime | None = None
