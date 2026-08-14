from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


def to_camel(value: str) -> str:
    parts = value.split("_")
    return parts[0] + "".join(part.capitalize() for part in parts[1:])


class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
        from_attributes=True,
    )


class Coordinates(CamelModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)


class MessageResponse(CamelModel):
    message: str


class PageResponse(CamelModel):
    items: list[Any]
    next_cursor: str | None = None
    total: int | None = None


class ProviderResponse(CamelModel):
    configured: bool
    message: str


def serialize_model(model: BaseModel) -> dict[str, Any]:
    return model.model_dump(mode="json", by_alias=False, exclude_none=True)


def parse_datetime(value: str | datetime) -> datetime:
    return (
        value
        if isinstance(value, datetime)
        else datetime.fromisoformat(value.replace("Z", "+00:00"))
    )
