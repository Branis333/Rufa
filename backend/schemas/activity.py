from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import Field

from core.enums import (
    ActivityCategory,
    ContributionStatus,
    NotificationType,
    VerificationStatus,
)
from schemas.common import CamelModel


class DonationResponse(CamelModel):
    donation_id: UUID
    commitment_id: UUID
    request_id: UUID
    hospital_id: UUID
    bags_donated: int
    lives_helped_estimate: int
    completed_at: datetime


class ActivityResponse(CamelModel):
    activity_id: UUID
    category: ActivityCategory
    status: str
    title: str
    subtitle: str | None = None
    bags: int = 0
    amount_cents: int | None = None
    occurred_at: datetime


class ActivitySummary(CamelModel):
    donations: int
    requests: int
    contributions_cents: int
    lives_helped_estimate: int


class NotificationResponse(CamelModel):
    notification_id: UUID
    type: NotificationType
    title: str
    message: str
    payload: dict[str, Any]
    is_read: bool
    read_at: datetime | None = None
    created_at: datetime


class VerificationCreate(CamelModel):
    document_type: str = Field(pattern=r"^(national_id|passport|drivers_license)$")
    document_reference: str = Field(min_length=3, max_length=255)
    selfie_reference: str | None = Field(default=None, max_length=255)


class VerificationReview(CamelModel):
    status: VerificationStatus
    notes: str | None = Field(default=None, max_length=1000)


class VerificationResponse(CamelModel):
    application_id: UUID
    user_id: UUID
    status: VerificationStatus
    submitted_at: datetime
    reviewed_at: datetime | None = None
    review_notes: str | None = None


class VerificationStatusResponse(CamelModel):
    status: VerificationStatus
    application: VerificationResponse | None = None


class ContributionCreate(CamelModel):
    amount_cents: int = Field(ge=100, le=10_000_000)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    campaign_code: str = Field(default="general", min_length=1, max_length=64)
    provider: str = Field(default="unconfigured", max_length=64)


class ContributionResponse(CamelModel):
    contribution_id: UUID
    amount_cents: int
    currency: str
    provider: str
    status: ContributionStatus
    campaign_code: str
    checkout_url: str | None = None
    provider_configured: bool = False
    created_at: datetime
