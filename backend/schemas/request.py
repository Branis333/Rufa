from datetime import datetime
from uuid import UUID

from pydantic import Field

from core.enums import BloodGroup, CommitmentStatus, RequestStatus, Urgency
from schemas.common import CamelModel, Coordinates


class BloodRequestCreate(CamelModel):
    hospital_id: UUID
    recipient_display_name: str = Field(min_length=1, max_length=100)
    blood_group: BloodGroup
    bags_needed: int = Field(ge=1, le=20)
    urgency: Urgency
    broadcast_mode: str = Field(default="nearby", pattern=r"^(nearby|direct)$")
    recipient_coordinates: Coordinates | None = None
    search_radius_km: int = Field(default=25, ge=5, le=100)
    donor_ids: list[UUID] = Field(default_factory=list, max_length=100)


class BloodRequestResponse(CamelModel):
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
    recipient_coordinates: Coordinates | None = None
    search_radius_km: int
    distance_km: float | None = None
    created_at: datetime
    updated_at: datetime


class NearbyRequestQuery(CamelModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_km: int = Field(default=25, ge=1, le=100)
    blood_group: BloodGroup | None = None
    urgency: Urgency | None = None
    limit: int = Field(default=25, ge=1, le=100)
    cursor: str | None = None


class EligibilitySubmission(CamelModel):
    answers: dict[str, bool]


class EligibilityResponse(CamelModel):
    eligible: bool
    failed_question_ids: list[str]
    commitment_id: UUID


class DeclineRequest(CamelModel):
    reason: str | None = Field(default=None, max_length=255)


class CommitmentStatusUpdate(CamelModel):
    status: CommitmentStatus
    coordinates: Coordinates | None = None
    eta_seconds: int | None = Field(default=None, ge=0, le=86400)


class CommitmentResponse(CamelModel):
    commitment_id: UUID
    request_id: UUID
    donor_id: UUID
    status: CommitmentStatus
    bags_committed: int
    decline_reason: str | None = None
    coordinates: Coordinates | None = None
    eta_seconds: int | None = None
    accepted_at: datetime | None = None
    moving_started_at: datetime | None = None
    arrived_at: datetime | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class CommitmentProgress(CamelModel):
    request_id: UUID
    bags_needed: int
    bags_committed: int
    commitments: list[CommitmentResponse]


class DonorSearchQuery(CamelModel):
    blood_group: BloodGroup
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    radius_km: int = Field(default=25, ge=1, le=100)
    verified_only: bool = False
    limit: int = Field(default=25, ge=1, le=100)


class DonorSearchResponse(CamelModel):
    user_id: UUID
    display_name: str
    blood_group: BloodGroup
    distance_km: float
    is_verified: bool
    rating_avg: float


class DirectRequestCreate(CamelModel):
    hospital_id: UUID
    recipient_display_name: str = Field(min_length=1, max_length=100)
    blood_group: BloodGroup
    bags_needed: int = Field(ge=1, le=20)
    urgency: Urgency
    donor_ids: list[UUID] = Field(min_length=1, max_length=100)
    recipient_coordinates: Coordinates | None = None
