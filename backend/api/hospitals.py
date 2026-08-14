from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from core.exceptions import AppError, NotFoundError
from repositories.domain import DomainRepository, get_domain_repository
from schemas.hospital import HospitalResponse

router = APIRouter(prefix="/hospitals", tags=["Hospitals"])


def _hospital_response(row: dict) -> dict:
    return {
        **row,
        "coordinates": {"lat": row["latitude"], "lng": row["longitude"]},
    }


@router.get("", response_model=list[HospitalResponse])
def list_hospitals(
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    q: Annotated[str | None, Query(max_length=100)] = None,
    lat: Annotated[float | None, Query(ge=-90, le=90)] = None,
    lng: Annotated[float | None, Query(ge=-180, le=180)] = None,
    radius_km: Annotated[float, Query(gt=0, le=250)] = 50,
) -> list[dict]:
    if (lat is None) != (lng is None):
        raise AppError("lat and lng must be supplied together.")
    if lat is not None and lng is not None:
        rows = repository.rpc(
            "nearby_hospitals",
            {
                "p_lat": lat,
                "p_lng": lng,
                "p_radius_km": radius_km,
                "p_query": q,
                "p_limit": 100,
            },
        )
    else:
        rows = repository.list(
            "hospitals",
            filters={"is_active": True},
            order_by="name",
            descending=False,
            limit=100,
        )
        if q:
            query = q.casefold()
            rows = [
                row
                for row in rows
                if query in row["name"].casefold()
                or query in (row.get("city") or "").casefold()
            ]
    return [_hospital_response(row) for row in rows]


@router.get("/{hospital_id}", response_model=HospitalResponse)
def get_hospital(
    hospital_id: UUID,
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    row = repository.get("hospitals", "hospital_id", str(hospital_id))
    if row is None or not row.get("is_active", True):
        raise NotFoundError("Hospital not found.")
    return _hospital_response(row)
