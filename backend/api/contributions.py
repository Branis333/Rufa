from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status

from api.dependencies import get_current_user
from core.enums import ActivityCategory, ContributionStatus
from core.pagination import decode_cursor
from core.realtime import realtime_hub
from models.user import User
from repositories.domain import DomainRepository, get_domain_repository
from schemas.activity import ContributionCreate, ContributionResponse

router = APIRouter(prefix="/contributions", tags=["Contributions"])


@router.post(
    "",
    response_model=ContributionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_contribution(
    data: ContributionCreate,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    contribution = repository.insert(
        "contributions",
        {
            "user_id": str(user.user_id),
            **data.model_dump(mode="json"),
            "currency": data.currency.upper(),
            "status": ContributionStatus.PENDING.value,
        },
    )
    repository.insert(
        "activity_events",
        {
            "user_id": str(user.user_id),
            "category": ActivityCategory.SUPPORT.value,
            "status": ContributionStatus.PENDING.value,
            "title": "Contribution started",
            "subtitle": data.campaign_code,
            "amount_cents": data.amount_cents,
        },
    )
    background_tasks.add_task(
        realtime_hub.broadcast,
        f"user:{user.user_id}",
        {"type": "contribution.updated", "data": contribution},
    )
    return {
        **contribution,
        "checkout_url": None,
        "provider_configured": False,
    }


@router.get("", response_model=list[ContributionResponse])
def list_contributions(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    cursor: str | None = None,
) -> list[dict]:
    rows = repository.list(
        "contributions",
        filters={"user_id": str(user.user_id)},
        limit=limit,
        cursor_field="created_at",
        cursor=decode_cursor(cursor),
    )
    return [
        {
            **row,
            "checkout_url": None,
            "provider_configured": False,
        }
        for row in rows
    ]
