import base64
from datetime import datetime

from pydantic import BaseModel, Field


class PageParams(BaseModel):
    limit: int = Field(default=25, ge=1, le=100)
    cursor: str | None = None


def encode_cursor(value: datetime) -> str:
    return base64.urlsafe_b64encode(value.isoformat().encode()).decode()


def decode_cursor(value: str | None) -> str | None:
    if value is None:
        return None
    try:
        return base64.urlsafe_b64decode(value.encode()).decode()
    except (ValueError, UnicodeDecodeError) as error:
        raise ValueError("Invalid pagination cursor.") from error
