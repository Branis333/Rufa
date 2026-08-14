from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from core.enums import AvailabilityStatus


class UserPreferences(BaseModel):
    user_id: UUID
    max_travel_radius_km: int
    availability_status: AvailabilityStatus
    notify_urgent_requests: bool
    notify_request_updates: bool
    notify_donation_reminders: bool
    notify_chat_messages: bool
    updated_at: datetime


class UserLocation(BaseModel):
    user_id: UUID
    latitude: float | None = None
    longitude: float | None = None
    city: str | None = None
    region: str | None = None
    country_code: str | None = None
    permission_granted: bool
    updated_at: datetime
