from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from api.dependencies import get_current_user
from core.enums import BloodGroup
from models.user import User
from repositories.domain import DomainRepository, get_domain_repository
from schemas.request import (
    BloodRequestResponse,
    DirectRequestCreate,
    DonorSearchResponse,
)
from services.requests import RequestService

router = APIRouter(prefix="/donors", tags=["Donors"])


@router.get("/search", response_model=list[DonorSearchResponse])
def search_donors(
    _user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    blood_group: BloodGroup,
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
    radius_km: Annotated[int, Query(ge=1, le=100)] = 25,
    verified_only: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
) -> list[dict]:
    rows = repository.rpc(
        "search_compatible_donors",
        {
            "p_blood_group": blood_group.value,
            "p_lat": lat,
            "p_lng": lng,
            "p_radius_km": radius_km,
            "p_limit": limit,
        },
    )
    if verified_only:
        rows = [row for row in rows if row["is_verified"]]
    return rows


@router.post(
    "/direct-request",
    response_model=BloodRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def direct_request(
    data: DirectRequestCreate,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    donor_ids = [donor_id for donor_id in data.donor_ids if donor_id != user.user_id]
    payload = data.model_dump(mode="json", exclude_none=True)
    payload.update(
        {
            "broadcast_mode": "direct",
            "search_radius_km": 25,
            "donor_ids": donor_ids,
        }
    )
    created = RequestService(repository).create(
        requester_id=user.user_id,
        data=payload,
    )
    coordinates = None
    if created.get("recipient_latitude") is not None:
        coordinates = {
            "lat": created["recipient_latitude"],
            "lng": created["recipient_longitude"],
        }
    return {**created, "recipient_coordinates": coordinates}
