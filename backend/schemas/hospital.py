from uuid import UUID

from pydantic import Field

from schemas.common import CamelModel, Coordinates


class HospitalResponse(CamelModel):
    hospital_id: UUID
    name: str
    address: str | None = None
    city: str | None = None
    coordinates: Coordinates
    phone: str | None = None
    distance_km: float | None = None


class HospitalQuery(CamelModel):
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    radius_km: float = Field(default=50, gt=0, le=250)
    q: str | None = Field(default=None, max_length=100)
