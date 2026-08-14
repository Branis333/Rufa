from datetime import date, datetime, timezone
from typing import Annotated
from uuid import UUID

from pydantic import (
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

from core.enums import AvailabilityStatus, BloodGroup
from schemas.common import CamelModel

Name = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
OptionalText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1),
]


class UserCreate(CamelModel):
    fname: Name | None = None
    lname: Name | None = None
    username: Name | None = None
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone_number: Annotated[str | None, Field(max_length=32)] = None
    blood_group: BloodGroup | None = None
    location: Annotated[OptionalText | None, Field(max_length=255)] = None
    city: Annotated[OptionalText | None, Field(max_length=100)] = None
    date_of_birth: date | None = None
    max_travel_radius_km: int = Field(default=25, ge=5, le=100)

    @model_validator(mode="after")
    def require_name(self) -> "UserCreate":
        if self.username is None and (self.fname is None or self.lname is None):
            raise ValueError("Provide username or both fname and lname.")
        return self

    @property
    def resolved_fname(self) -> str:
        if self.fname:
            return self.fname
        return self.username.split(maxsplit=1)[0] if self.username else ""

    @property
    def resolved_lname(self) -> str:
        if self.lname:
            return self.lname
        if self.username and " " in self.username:
            return self.username.split(maxsplit=1)[1]
        return "-"

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_cannot_be_future(cls, value: date | None) -> date | None:
        if value is not None and value > datetime.now(timezone.utc).date():
            raise ValueError("Date of birth cannot be in the future.")
        return value


class UserResponse(CamelModel):
    user_id: UUID
    fname: str
    lname: str
    display_name: str | None = None
    email: EmailStr
    phone_number: str | None
    blood_group: str | None
    location: str | None
    date_of_birth: date | None
    roles: list[str]
    is_active: bool
    is_verified: bool
    rating_avg: float = 0
    created_at: datetime
    updated_at: datetime


class UserUpdate(CamelModel):
    fname: Name | None = None
    lname: Name | None = None
    display_name: Name | None = None
    phone_number: Annotated[str | None, Field(max_length=32)] = None
    blood_group: BloodGroup | None = None
    location: Annotated[OptionalText | None, Field(max_length=255)] = None
    date_of_birth: date | None = None


class PreferencesUpdate(CamelModel):
    max_travel_radius_km: int | None = Field(default=None, ge=5, le=100)
    availability_status: AvailabilityStatus | None = None
    notify_urgent_requests: bool | None = None
    notify_request_updates: bool | None = None
    notify_donation_reminders: bool | None = None
    notify_chat_messages: bool | None = None


class PreferencesResponse(CamelModel):
    user_id: UUID
    max_travel_radius_km: int
    availability_status: AvailabilityStatus
    notify_urgent_requests: bool
    notify_request_updates: bool
    notify_donation_reminders: bool
    notify_chat_messages: bool
    updated_at: datetime


class LocationUpdate(CamelModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    city: str | None = Field(default=None, max_length=100)
    region: str | None = Field(default=None, max_length=100)
    country_code: str | None = Field(default=None, min_length=2, max_length=2)
    permission_granted: bool = True


class LocationResponse(CamelModel):
    user_id: UUID
    latitude: float | None = None
    longitude: float | None = None
    city: str | None = None
    region: str | None = None
    country_code: str | None = None
    permission_granted: bool
    updated_at: datetime


class UserStats(CamelModel):
    total_donations: int = 0
    active_requests: int = 0
    total_contributed_cents: int = 0
    rating_avg: float = 0


class PushTokenUpsert(CamelModel):
    token: str = Field(min_length=10, max_length=512)
    platform: str = Field(pattern=r"^(ios|android|web)$")


class PushTokenResponse(CamelModel):
    push_token_id: UUID
    platform: str
    updated_at: datetime
