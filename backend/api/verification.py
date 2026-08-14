from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, status

from api.dependencies import get_current_user
from core.enums import NotificationType, VerificationStatus
from core.exceptions import ConflictError, ForbiddenError, NotFoundError
from core.realtime import realtime_hub
from models.user import User
from repositories.domain import DomainRepository, get_domain_repository
from schemas.activity import (
    VerificationCreate,
    VerificationResponse,
    VerificationReview,
    VerificationStatusResponse,
)

router = APIRouter(prefix="/verification", tags=["Verification"])


@router.post(
    "/request",
    response_model=VerificationResponse,
    status_code=status.HTTP_201_CREATED,
)
def request_verification(
    data: VerificationCreate,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    if user.is_verified:
        raise ConflictError("This account is already verified.")
    pending = repository.find_one(
        "verification_applications",
        filters={"user_id": str(user.user_id), "status": "pending"},
    )
    if pending:
        raise ConflictError("A verification request is already pending.")
    return repository.insert(
        "verification_applications",
        {
            "user_id": str(user.user_id),
            **data.model_dump(mode="json"),
            "status": VerificationStatus.PENDING.value,
        },
    )


@router.get("/status", response_model=VerificationStatusResponse)
def verification_status(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> VerificationStatusResponse:
    rows = repository.list(
        "verification_applications",
        filters={"user_id": str(user.user_id)},
        order_by="submitted_at",
        limit=1,
    )
    if not rows:
        return VerificationStatusResponse(status=VerificationStatus.UNVERIFIED)
    application = VerificationResponse.model_validate(rows[0])
    return VerificationStatusResponse(
        status=application.status,
        application=application,
    )


@router.patch("/{application_id}/review", response_model=VerificationResponse)
def review_verification(
    application_id: UUID,
    data: VerificationReview,
    background_tasks: BackgroundTasks,
    reviewer: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    if "admin" not in reviewer.roles:
        raise ForbiddenError("Administrator access is required.")
    if data.status not in {
        VerificationStatus.VERIFIED,
        VerificationStatus.REJECTED,
    }:
        raise ConflictError("Review status must be verified or rejected.")
    application = repository.get(
        "verification_applications", "application_id", str(application_id)
    )
    if application is None:
        raise NotFoundError("Verification application not found.")
    if application["status"] != VerificationStatus.PENDING.value:
        raise ConflictError("This application was already reviewed.")
    reviewed = repository.update(
        "verification_applications",
        "application_id",
        str(application_id),
        {
            "status": data.status.value,
            "reviewed_at": datetime.now(timezone.utc).isoformat(),
            "reviewer_id": str(reviewer.user_id),
            "review_notes": data.notes,
        },
    )
    repository.update(
        "users",
        "user_id",
        application["user_id"],
        {"is_verified": data.status is VerificationStatus.VERIFIED},
    )
    repository.insert(
        "notifications",
        {
            "user_id": application["user_id"],
            "type": NotificationType.VERIFICATION_UPDATE.value,
            "title": "Verification updated",
            "message": f"Your verification is now {data.status.value}.",
            "payload": {"applicationId": str(application_id)},
        },
    )
    background_tasks.add_task(
        realtime_hub.broadcast,
        f"user:{application['user_id']}",
        {"type": "verification.updated", "data": reviewed},
    )
    return reviewed
