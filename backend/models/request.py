from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from core.enums import BloodGroup, CommitmentStatus, RequestStatus, Urgency


class Hospital(BaseModel):
    hospital_id: UUID
    name: str
    address: str | None = None
    city: str | None = None
    latitude: float
    longitude: float
    phone: str | None = None
    is_active: bool = True
    created_at: datetime


class BloodRequest(BaseModel):
    request_id: UUID
    requester_id: UUID
    hospital_id: UUID
    blood_group: BloodGroup
    bags_needed: int
    bags_committed: int
    urgency: Urgency
    status: RequestStatus
    broadcast_mode: str
    recipient_display_name: str
    recipient_latitude: float | None = None
    recipient_longitude: float | None = None
    search_radius_km: int
    created_at: datetime
    updated_at: datetime


class Commitment(BaseModel):
    commitment_id: UUID
    request_id: UUID
    donor_id: UUID
    status: CommitmentStatus
    bags_committed: int = 1
    decline_reason: str | None = None
    last_latitude: float | None = None
    last_longitude: float | None = None
    eta_seconds: int | None = None
    accepted_at: datetime | None = None
    moving_started_at: datetime | None = None
    arrived_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class EligibilityCheck(BaseModel):
    check_id: UUID
    commitment_id: UUID
    answers: dict[str, bool]
    failed_question_ids: list[str]
    result: str
    question_set_version: int
    submitted_at: datetime


class DonorSearchResult(BaseModel):
    user_id: UUID
    blood_group: BloodGroup
    distance_km: float
    is_verified: bool
    display_name: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
