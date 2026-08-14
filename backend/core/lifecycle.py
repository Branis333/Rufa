from core.enums import CommitmentStatus, RequestStatus
from core.exceptions import InvalidStateError

COMMITMENT_TRANSITIONS: dict[CommitmentStatus, set[CommitmentStatus]] = {
    CommitmentStatus.PENDING_ELIGIBILITY: {
        CommitmentStatus.ACCEPTED,
        CommitmentStatus.INELIGIBLE,
        CommitmentStatus.DECLINED,
    },
    CommitmentStatus.ACCEPTED: {
        CommitmentStatus.MOVING,
        CommitmentStatus.CANCELLED,
    },
    CommitmentStatus.MOVING: {
        CommitmentStatus.ARRIVED,
        CommitmentStatus.CANCELLED,
    },
    CommitmentStatus.ARRIVED: {
        CommitmentStatus.COMPLETED,
        CommitmentStatus.CANCELLED,
    },
    CommitmentStatus.COMPLETED: set(),
    CommitmentStatus.DECLINED: set(),
    CommitmentStatus.INELIGIBLE: set(),
    CommitmentStatus.CANCELLED: set(),
}

REQUEST_TRANSITIONS: dict[RequestStatus, set[RequestStatus]] = {
    RequestStatus.OPEN: {
        RequestStatus.PARTIALLY_MATCHED,
        RequestStatus.MATCHED,
        RequestStatus.CANCELLED,
    },
    RequestStatus.PARTIALLY_MATCHED: {
        RequestStatus.MATCHED,
        RequestStatus.CANCELLED,
    },
    RequestStatus.MATCHED: {
        RequestStatus.IN_PROGRESS,
        RequestStatus.CANCELLED,
    },
    RequestStatus.IN_PROGRESS: {
        RequestStatus.COMPLETED,
        RequestStatus.CANCELLED,
    },
    RequestStatus.COMPLETED: set(),
    RequestStatus.CANCELLED: set(),
}


def ensure_commitment_transition(
    current: CommitmentStatus, target: CommitmentStatus
) -> None:
    if target not in COMMITMENT_TRANSITIONS[current]:
        raise InvalidStateError(
            f"Commitment cannot move from {current.value} to {target.value}."
        )


def ensure_request_transition(current: RequestStatus, target: RequestStatus) -> None:
    if target not in REQUEST_TRANSITIONS[current]:
        raise InvalidStateError(
            f"Request cannot move from {current.value} to {target.value}."
        )
