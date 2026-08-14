from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


class User(BaseModel):
    user_id: UUID
    fname: str
    lname: str
    display_name: str | None = None
    email: EmailStr
    password_hash: str
    phone_number: str | None = None
    blood_group: str | None = None
    location: str | None = None
    date_of_birth: date | None = None
    roles: list[str]
    is_active: bool
    is_verified: bool
    rating_avg: float = 0
    rating_count: int = 0
    last_donation_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
