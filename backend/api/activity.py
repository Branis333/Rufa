from typing import Annotated

from fastapi import APIRouter, Depends, Query

from api.dependencies import get_current_user
from core.enums import ActivityCategory
from core.pagination import decode_cursor
from models.user import User
from repositories.domain import DomainRepository, get_domain_repository
from schemas.activity import (
    ActivityResponse,
    ActivitySummary,
    DonationResponse,
)

router = APIRouter(tags=["Activity"])


@router.get("/donations", response_model=list[DonationResponse])
def list_donations(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    cursor: str | None = None,
) -> list[dict]:
    return repository.list(
        "donations",
        filters={"donor_id": str(user.user_id)},
        order_by="completed_at",
        limit=limit,
        cursor_field="completed_at",
        cursor=decode_cursor(cursor),
    )


@router.get("/activity", response_model=list[ActivityResponse])
def list_activity(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    category: ActivityCategory | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    cursor: str | None = None,
) -> list[dict]:
    filters = {"user_id": str(user.user_id)}
    if category:
        filters["category"] = category.value
    return repository.list(
        "activity_events",
        filters=filters,
        order_by="occurred_at",
        limit=limit,
        cursor_field="occurred_at",
        cursor=decode_cursor(cursor),
    )


@router.get("/activity/summary", response_model=ActivitySummary)
def activity_summary(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> ActivitySummary:
    contributions = repository.list(
        "activity_events",
        filters={
            "user_id": str(user.user_id),
            "category": ActivityCategory.SUPPORT.value,
            "status": "succeeded",
        },
        order_by="occurred_at",
        limit=100,
    )
    donations = repository.list(
        "donations",
        filters={"donor_id": str(user.user_id)},
        order_by="completed_at",
        limit=100,
    )
    return ActivitySummary(
        donations=len(donations),
        requests=repository.count(
            "blood_requests", filters={"requester_id": str(user.user_id)}
        ),
        contributions_cents=sum(row.get("amount_cents") or 0 for row in contributions),
        lives_helped_estimate=sum(row["lives_helped_estimate"] for row in donations),
    )
