from datetime import date, datetime, timezone
from typing import Annotated, Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    StringConstraints,
    field_validator,
)

Name = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=100),
]
OptionalText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1),
]
BloodGroup = Literal["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]


class UserCreate(BaseModel):
    fname: Name
    lname: Name
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    phone_number: Annotated[str | None, Field(max_length=32)] = None
    blood_group: BloodGroup | None = None
    location: Annotated[OptionalText | None, Field(max_length=255)] = None
    date_of_birth: date | None = None

    @field_validator("date_of_birth")
    @classmethod
    def date_of_birth_cannot_be_future(cls, value: date | None) -> date | None:
        if value is not None and value > datetime.now(timezone.utc).date():
            raise ValueError("Date of birth cannot be in the future.")
        return value


class UserResponse(BaseModel):
    user_id: UUID = Field(serialization_alias="userId")
    fname: str
    lname: str
    email: EmailStr
    phone_number: str | None
    blood_group: str | None
    location: str | None
    date_of_birth: date | None
    roles: list[str]
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
