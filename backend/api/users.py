from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, status

from api.dependencies import get_current_user
from core.enums import AvailabilityStatus
from core.exceptions import NotFoundError
from database import UserRepository, get_user_repository
from models.user import User
from repositories.domain import DomainRepository, get_domain_repository
from schemas.user import (
    LocationResponse,
    LocationUpdate,
    PreferencesResponse,
    PreferencesUpdate,
    PushTokenResponse,
    PushTokenUpsert,
    UserResponse,
    UserStats,
    UserUpdate,
)

router = APIRouter(prefix="/users", tags=["Users"])


@router.patch("/me", response_model=UserResponse)
def update_me(
    data: UserUpdate,
    user: Annotated[User, Depends(get_current_user)],
    users: Annotated[UserRepository, Depends(get_user_repository)],
) -> User:
    changes = data.model_dump(mode="json", exclude_none=True)
    if not changes:
        return user
    return users.update(user.user_id, changes)


@router.get("/me/preferences", response_model=PreferencesResponse)
def get_preferences(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    row = repository.get("user_preferences", "user_id", str(user.user_id))
    if row:
        return row
    return {
        "user_id": user.user_id,
        "max_travel_radius_km": 25,
        "availability_status": AvailabilityStatus.AVAILABLE,
        "notify_urgent_requests": True,
        "notify_request_updates": True,
        "notify_donation_reminders": True,
        "notify_chat_messages": True,
        "updated_at": datetime.now(timezone.utc),
    }


@router.patch("/me/preferences", response_model=PreferencesResponse)
def update_preferences(
    data: PreferencesUpdate,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    changes = data.model_dump(mode="json", exclude_none=True)
    return repository.upsert(
        "user_preferences",
        {"user_id": str(user.user_id), **changes},
        on_conflict="user_id",
    )


@router.get("/me/location", response_model=LocationResponse)
def get_location(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    row = repository.get("user_locations", "user_id", str(user.user_id))
    if row is None:
        raise NotFoundError("Location has not been set.")
    return row


@router.put("/me/location", response_model=LocationResponse)
def update_location(
    data: LocationUpdate,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    return repository.upsert(
        "user_locations",
        {"user_id": str(user.user_id), **data.model_dump(mode="json")},
        on_conflict="user_id",
    )


@router.get("/me/stats", response_model=UserStats)
def get_stats(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> UserStats:
    contributions = repository.list(
        "contributions",
        filters={"user_id": str(user.user_id), "status": "succeeded"},
        limit=100,
    )
    return UserStats(
        total_donations=repository.count(
            "donations", filters={"donor_id": str(user.user_id)}
        ),
        active_requests=repository.count(
            "blood_requests",
            filters={"requester_id": str(user.user_id), "status": "open"},
        ),
        total_contributed_cents=sum(row["amount_cents"] for row in contributions),
        rating_avg=user.rating_avg,
    )


@router.put(
    "/me/push-token",
    response_model=PushTokenResponse,
    status_code=status.HTTP_200_OK,
)
def register_push_token(
    data: PushTokenUpsert,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    return repository.upsert(
        "push_tokens",
        {
            "user_id": str(user.user_id),
            **data.model_dump(mode="json"),
        },
        on_conflict="token",
    )
