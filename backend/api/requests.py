from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, Query, status

from api.dependencies import get_current_user
from core.enums import BloodGroup, CommitmentStatus, RequestStatus, Urgency
from core.exceptions import ConflictError, ForbiddenError, NotFoundError
from core.lifecycle import ensure_request_transition
from core.pagination import decode_cursor
from core.privacy import project_coordinates
from core.realtime import realtime_hub
from models.user import User
from repositories.domain import DomainRepository, get_domain_repository
from schemas.request import (
    BloodRequestCreate,
    BloodRequestResponse,
    CommitmentProgress,
    CommitmentResponse,
    CommitmentStatusUpdate,
    DeclineRequest,
    EligibilityResponse,
    EligibilitySubmission,
)
from services.requests import RequestService

router = APIRouter(prefix="/requests", tags=["Blood Requests"])


def _request_response(row: dict, *, precise: bool) -> dict:
    return {
        **row,
        "recipient_coordinates": project_coordinates(
            row.get("recipient_latitude"),
            row.get("recipient_longitude"),
            precise=precise,
        ),
    }


def _commitment_response(row: dict, *, precise: bool) -> dict:
    return {
        **row,
        "coordinates": project_coordinates(
            row.get("last_latitude"),
            row.get("last_longitude"),
            precise=precise,
        ),
    }


def _get_request(repository: DomainRepository, request_id: UUID) -> dict:
    row = repository.get("blood_requests", "request_id", str(request_id))
    if row is None:
        raise NotFoundError("Blood request not found.")
    return row


def _is_participant(repository: DomainRepository, request: dict, user_id: UUID) -> bool:
    if request["requester_id"] == str(user_id):
        return True
    commitment = repository.find_one(
        "request_commitments",
        filters={"request_id": request["request_id"], "donor_id": str(user_id)},
    )
    return commitment is not None and commitment["status"] not in {
        CommitmentStatus.DECLINED.value,
        CommitmentStatus.INELIGIBLE.value,
        CommitmentStatus.CANCELLED.value,
    }


@router.post(
    "",
    response_model=BloodRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_request(
    data: BloodRequestCreate,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    created = RequestService(repository).create(
        requester_id=user.user_id,
        data=data.model_dump(mode="json", exclude_none=True),
    )
    background_tasks.add_task(
        realtime_hub.broadcast,
        f"request:{created['request_id']}",
        {"type": "request.created", "data": created},
    )
    for donor_id in data.donor_ids:
        background_tasks.add_task(
            realtime_hub.broadcast,
            f"user:{donor_id}",
            {"type": "incoming_request", "data": created},
        )
    return _request_response(created, precise=True)


@router.get("/nearby", response_model=list[BloodRequestResponse])
def nearby_requests(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    lat: Annotated[float, Query(ge=-90, le=90)],
    lng: Annotated[float, Query(ge=-180, le=180)],
    radius_km: Annotated[int, Query(ge=1, le=100)] = 25,
    blood_group: BloodGroup | None = None,
    urgency: Urgency | None = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    cursor: str | None = None,
) -> list[dict]:
    cursor_value = decode_cursor(cursor)
    rows = repository.rpc(
        "nearby_blood_requests",
        {
            "p_lat": lat,
            "p_lng": lng,
            "p_radius_km": radius_km,
            "p_blood_group": blood_group.value if blood_group else None,
            "p_urgency": urgency.value if urgency else None,
            "p_limit": limit,
        },
    )
    if cursor_value:
        rows = [row for row in rows if row["created_at"] < cursor_value]
    return [
        _request_response(
            row,
            precise=_is_participant(repository, row, user.user_id),
        )
        for row in rows
    ]


@router.get("/mine", response_model=list[BloodRequestResponse])
def my_requests(
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    role: Annotated[str, Query(pattern=r"^(requester|donor)$")] = "requester",
    request_status: Annotated[RequestStatus | None, Query(alias="status")] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 25,
    cursor: str | None = None,
) -> list[dict]:
    if role == "requester":
        filters = {"requester_id": str(user.user_id)}
        if request_status:
            filters["status"] = request_status.value
        rows = repository.list(
            "blood_requests",
            filters=filters,
            limit=limit,
            cursor_field="created_at",
            cursor=decode_cursor(cursor),
        )
    else:
        commitments = repository.list(
            "request_commitments",
            filters={"donor_id": str(user.user_id)},
            limit=limit,
            cursor_field="created_at",
            cursor=decode_cursor(cursor),
        )
        rows = [
            request
            for commitment in commitments
            if (
                request := repository.get(
                    "blood_requests",
                    "request_id",
                    commitment["request_id"],
                )
            )
            and (not request_status or request["status"] == request_status.value)
        ]
    return [_request_response(row, precise=True) for row in rows]


@router.get("/{request_id}", response_model=BloodRequestResponse)
def request_detail(
    request_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    request = _get_request(repository, request_id)
    return _request_response(
        request,
        precise=_is_participant(repository, request, user.user_id),
    )


@router.post("/{request_id}/cancel", response_model=BloodRequestResponse)
def cancel_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    request = _get_request(repository, request_id)
    if request["requester_id"] != str(user.user_id):
        raise ForbiddenError("Only the requester can cancel this request.")
    current = RequestStatus(request["status"])
    ensure_request_transition(current, RequestStatus.CANCELLED)
    updated = repository.update(
        "blood_requests",
        "request_id",
        str(request_id),
        {"status": RequestStatus.CANCELLED.value},
    )
    repository.update_where(
        "request_commitments",
        filters={"request_id": str(request_id)},
        data={"status": CommitmentStatus.CANCELLED.value},
    )
    background_tasks.add_task(
        realtime_hub.broadcast,
        f"request:{request_id}",
        {"type": "request.cancelled", "data": updated},
    )
    return _request_response(updated, precise=True)


@router.post("/{request_id}/complete", response_model=BloodRequestResponse)
def complete_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    request = _get_request(repository, request_id)
    if request["requester_id"] != str(user.user_id):
        raise ForbiddenError("Only the requester can complete this request.")
    if request["status"] not in {
        RequestStatus.MATCHED.value,
        RequestStatus.IN_PROGRESS.value,
    }:
        raise ConflictError("This request is not ready to complete.")
    commitments = repository.list(
        "request_commitments",
        filters={"request_id": str(request_id)},
        limit=100,
    )
    completed_bags = sum(
        row["bags_committed"]
        for row in commitments
        if row["status"] == CommitmentStatus.COMPLETED.value
    )
    if completed_bags < request["bags_needed"]:
        raise ConflictError("All required donations have not been completed.")
    updated = repository.update(
        "blood_requests",
        "request_id",
        str(request_id),
        {"status": RequestStatus.COMPLETED.value},
    )
    background_tasks.add_task(
        realtime_hub.broadcast,
        f"request:{request_id}",
        {"type": "request.completed", "data": updated},
    )
    return _request_response(updated, precise=True)


@router.post(
    "/{request_id}/accept",
    response_model=CommitmentResponse,
    status_code=status.HTTP_201_CREATED,
)
def accept_request(
    request_id: UUID,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    blood_group = BloodGroup(user.blood_group) if user.blood_group else None
    commitment = RequestService(repository).start_commitment(
        request_id=request_id,
        donor_id=user.user_id,
        donor_blood_group=blood_group,
    )
    background_tasks.add_task(
        realtime_hub.broadcast,
        f"request:{request_id}",
        {"type": "commitment.started", "data": commitment},
    )
    return _commitment_response(commitment, precise=True)


@router.post("/{request_id}/eligibility", response_model=EligibilityResponse)
def submit_eligibility(
    request_id: UUID,
    data: EligibilitySubmission,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> EligibilityResponse:
    commitment, eligible, failed = RequestService(repository).submit_eligibility(
        request_id=request_id,
        donor_id=user.user_id,
        answers=data.answers,
    )
    request = _get_request(repository, request_id)
    event = {"type": "commitment.updated", "data": commitment}
    background_tasks.add_task(realtime_hub.broadcast, f"request:{request_id}", event)
    background_tasks.add_task(
        realtime_hub.broadcast, f"user:{request['requester_id']}", event
    )
    return EligibilityResponse(
        eligible=eligible,
        failed_question_ids=failed,
        commitment_id=commitment["commitment_id"],
    )


@router.post("/{request_id}/decline", response_model=CommitmentResponse)
def decline_request(
    request_id: UUID,
    data: DeclineRequest,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    _get_request(repository, request_id)
    commitment = RequestService(repository).decline(
        request_id=request_id,
        donor_id=user.user_id,
        reason=data.reason,
    )
    background_tasks.add_task(
        realtime_hub.broadcast,
        f"request:{request_id}",
        {"type": "commitment.declined", "data": commitment},
    )
    return _commitment_response(commitment, precise=True)


@router.get(
    "/{request_id}/commitments",
    response_model=CommitmentProgress,
)
def commitment_progress(
    request_id: UUID,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> CommitmentProgress:
    request = _get_request(repository, request_id)
    if request["requester_id"] != str(user.user_id):
        raise ForbiddenError("Only the requester can view all commitments.")
    rows = repository.list(
        "request_commitments",
        filters={"request_id": str(request_id)},
        limit=100,
    )
    return CommitmentProgress(
        request_id=request_id,
        bags_needed=request["bags_needed"],
        bags_committed=request["bags_committed"],
        commitments=[
            CommitmentResponse.model_validate(_commitment_response(row, precise=True))
            for row in rows
        ],
    )


@router.patch(
    "/commitments/{commitment_id}/status",
    response_model=CommitmentResponse,
)
def update_commitment_status(
    commitment_id: UUID,
    data: CommitmentStatusUpdate,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    if data.status not in {
        CommitmentStatus.MOVING,
        CommitmentStatus.ARRIVED,
        CommitmentStatus.COMPLETED,
        CommitmentStatus.CANCELLED,
    }:
        raise ConflictError("This status cannot be set directly.")
    coordinates = data.coordinates
    row = RequestService(repository).update_commitment_status(
        commitment_id=commitment_id,
        donor_id=user.user_id,
        target=data.status,
        latitude=coordinates.lat if coordinates else None,
        longitude=coordinates.lng if coordinates else None,
        eta_seconds=data.eta_seconds,
    )
    event_type = (
        "movement.updated"
        if data.status in {CommitmentStatus.MOVING, CommitmentStatus.ARRIVED}
        else "commitment.updated"
    )
    event = {"type": event_type, "data": row}
    background_tasks.add_task(
        realtime_hub.broadcast, f"commitment:{commitment_id}", event
    )
    background_tasks.add_task(
        realtime_hub.broadcast, f"request:{row['request_id']}", event
    )
    return _commitment_response(row, precise=True)


@router.post(
    "/commitments/{commitment_id}/complete",
    response_model=CommitmentResponse,
)
def complete_commitment(
    commitment_id: UUID,
    background_tasks: BackgroundTasks,
    user: Annotated[User, Depends(get_current_user)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
) -> dict:
    row = RequestService(repository).update_commitment_status(
        commitment_id=commitment_id,
        donor_id=user.user_id,
        target=CommitmentStatus.COMPLETED,
    )
    event = {"type": "commitment.completed", "data": row}
    background_tasks.add_task(
        realtime_hub.broadcast, f"commitment:{commitment_id}", event
    )
    background_tasks.add_task(
        realtime_hub.broadcast, f"request:{row['request_id']}", event
    )
    return _commitment_response(row, precise=True)
