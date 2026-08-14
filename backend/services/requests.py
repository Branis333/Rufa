from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from core.eligibility import evaluate_eligibility
from core.enums import (
    ActivityCategory,
    BloodGroup,
    CommitmentStatus,
    NotificationType,
    RequestStatus,
)
from core.exceptions import ConflictError, ForbiddenError, NotFoundError
from core.lifecycle import ensure_commitment_transition
from core.matching import can_donate
from repositories.protocols import DomainRepositoryProtocol


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class RequestService:
    def __init__(self, repository: DomainRepositoryProtocol) -> None:
        self.repository = repository

    def create(
        self,
        *,
        requester_id: UUID,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        hospital = self.repository.get(
            "hospitals", "hospital_id", str(data["hospital_id"])
        )
        if hospital is None or not hospital.get("is_active", True):
            raise NotFoundError("Hospital not found.")

        coordinates = data.pop("recipient_coordinates", None)
        donor_ids = data.pop("donor_ids", [])
        row = {
            **data,
            "requester_id": str(requester_id),
            "hospital_id": str(data["hospital_id"]),
            "recipient_latitude": coordinates["lat"] if coordinates else None,
            "recipient_longitude": coordinates["lng"] if coordinates else None,
        }
        request = self.repository.insert("blood_requests", row)
        self.repository.insert(
            "activity_events",
            {
                "user_id": str(requester_id),
                "category": ActivityCategory.REQUEST.value,
                "status": RequestStatus.OPEN.value,
                "title": "Blood request created",
                "subtitle": hospital["name"],
            },
        )
        self._notify_donors(request, donor_ids)
        return request

    def start_commitment(
        self,
        *,
        request_id: UUID,
        donor_id: UUID,
        donor_blood_group: BloodGroup | None,
    ) -> dict[str, Any]:
        request = self._request(request_id)
        if request["requester_id"] == str(donor_id):
            raise ForbiddenError("You cannot donate to your own request.")
        if request["status"] not in {
            RequestStatus.OPEN.value,
            RequestStatus.PARTIALLY_MATCHED.value,
        }:
            raise ConflictError("This request is not accepting donors.")
        if donor_blood_group is None or not can_donate(
            donor_blood_group, BloodGroup(request["blood_group"])
        ):
            raise ConflictError("Your blood group is not compatible with this request.")
        existing = self.repository.list(
            "request_commitments",
            filters={"request_id": str(request_id), "donor_id": str(donor_id)},
            limit=1,
        )
        if existing:
            raise ConflictError("You have already responded to this request.")
        return self.repository.insert(
            "request_commitments",
            {
                "request_id": str(request_id),
                "donor_id": str(donor_id),
                "status": CommitmentStatus.PENDING_ELIGIBILITY.value,
                "bags_committed": 1,
            },
        )

    def submit_eligibility(
        self,
        *,
        request_id: UUID,
        donor_id: UUID,
        answers: dict[str, bool],
    ) -> tuple[dict[str, Any], bool, list[str]]:
        commitment = self._donor_commitment(request_id, donor_id)
        if commitment["status"] != CommitmentStatus.PENDING_ELIGIBILITY.value:
            raise ConflictError("Eligibility was already submitted.")
        eligible, failed = evaluate_eligibility(answers)
        self.repository.insert(
            "eligibility_checks",
            {
                "commitment_id": commitment["commitment_id"],
                "answers": answers,
                "failed_question_ids": failed,
                "result": "eligible" if eligible else "ineligible",
                "question_set_version": 1,
            },
        )
        target = CommitmentStatus.ACCEPTED if eligible else CommitmentStatus.INELIGIBLE
        updated = self.repository.update(
            "request_commitments",
            "commitment_id",
            commitment["commitment_id"],
            {
                "status": target.value,
                "accepted_at": utc_now().isoformat() if eligible else None,
            },
        )
        if eligible:
            self._record_accepted_commitment(request_id, donor_id)
        return updated, eligible, failed

    def decline(
        self,
        *,
        request_id: UUID,
        donor_id: UUID,
        reason: str | None,
    ) -> dict[str, Any]:
        rows = self.repository.list(
            "request_commitments",
            filters={"request_id": str(request_id), "donor_id": str(donor_id)},
            limit=1,
        )
        if rows:
            commitment = rows[0]
            current = CommitmentStatus(commitment["status"])
            if current not in {
                CommitmentStatus.PENDING_ELIGIBILITY,
                CommitmentStatus.ACCEPTED,
            }:
                raise ConflictError("This commitment can no longer be declined.")
            return self.repository.update(
                "request_commitments",
                "commitment_id",
                commitment["commitment_id"],
                {
                    "status": CommitmentStatus.DECLINED.value,
                    "decline_reason": reason,
                },
            )
        return self.repository.insert(
            "request_commitments",
            {
                "request_id": str(request_id),
                "donor_id": str(donor_id),
                "status": CommitmentStatus.DECLINED.value,
                "decline_reason": reason,
                "bags_committed": 1,
            },
        )

    def update_commitment_status(
        self,
        *,
        commitment_id: UUID,
        donor_id: UUID,
        target: CommitmentStatus,
        latitude: float | None = None,
        longitude: float | None = None,
        eta_seconds: int | None = None,
    ) -> dict[str, Any]:
        commitment = self.repository.get(
            "request_commitments", "commitment_id", str(commitment_id)
        )
        if commitment is None:
            raise NotFoundError("Commitment not found.")
        if commitment["donor_id"] != str(donor_id):
            raise ForbiddenError("Only the donor can update this commitment.")
        current = CommitmentStatus(commitment["status"])
        ensure_commitment_transition(current, target)
        now = utc_now().isoformat()
        timestamp_fields = {
            CommitmentStatus.MOVING: "moving_started_at",
            CommitmentStatus.ARRIVED: "arrived_at",
            CommitmentStatus.COMPLETED: "completed_at",
        }
        update: dict[str, Any] = {
            "status": target.value,
            "last_latitude": latitude,
            "last_longitude": longitude,
            "eta_seconds": eta_seconds,
        }
        if target in timestamp_fields:
            update[timestamp_fields[target]] = now
        updated = self.repository.update(
            "request_commitments", "commitment_id", str(commitment_id), update
        )
        request = self._request(UUID(commitment["request_id"]))
        if (
            target is CommitmentStatus.MOVING
            and request["status"] == RequestStatus.MATCHED.value
        ):
            self.repository.update(
                "blood_requests",
                "request_id",
                request["request_id"],
                {"status": RequestStatus.IN_PROGRESS.value},
            )
        if target is CommitmentStatus.CANCELLED and current in {
            CommitmentStatus.ACCEPTED,
            CommitmentStatus.MOVING,
            CommitmentStatus.ARRIVED,
        }:
            bags = max(0, request["bags_committed"] - 1)
            self.repository.update(
                "blood_requests",
                "request_id",
                request["request_id"],
                {
                    "bags_committed": bags,
                    "status": (
                        RequestStatus.PARTIALLY_MATCHED.value
                        if bags
                        else RequestStatus.OPEN.value
                    ),
                },
            )
        if target is CommitmentStatus.COMPLETED:
            self._record_completed_donation(updated)
        return updated

    def _request(self, request_id: UUID) -> dict[str, Any]:
        request = self.repository.get("blood_requests", "request_id", str(request_id))
        if request is None:
            raise NotFoundError("Blood request not found.")
        return request

    def _donor_commitment(self, request_id: UUID, donor_id: UUID) -> dict[str, Any]:
        rows = self.repository.list(
            "request_commitments",
            filters={"request_id": str(request_id), "donor_id": str(donor_id)},
            limit=1,
        )
        if not rows:
            raise NotFoundError("Commitment not found.")
        return rows[0]

    def _notify_donors(self, request: dict[str, Any], donor_ids: list[UUID]) -> None:
        if not donor_ids and request["broadcast_mode"] == "nearby":
            rows = self.repository.rpc(
                "search_compatible_donors",
                {
                    "p_blood_group": request["blood_group"],
                    "p_lat": request["recipient_latitude"],
                    "p_lng": request["recipient_longitude"],
                    "p_radius_km": request["search_radius_km"],
                    "p_limit": 100,
                },
            )
            donor_ids = [UUID(row["user_id"]) for row in rows]
        for donor_id in donor_ids:
            self.repository.insert(
                "notifications",
                {
                    "user_id": str(donor_id),
                    "type": NotificationType.URGENT_REQUEST.value,
                    "title": f"{request['blood_group']} blood needed",
                    "message": "A compatible request is waiting for a donor.",
                    "payload": {"requestId": request["request_id"]},
                },
            )

    def _record_accepted_commitment(self, request_id: UUID, donor_id: UUID) -> None:
        request = self._request(request_id)
        bags = min(request["bags_needed"], request["bags_committed"] + 1)
        status = (
            RequestStatus.MATCHED
            if bags >= request["bags_needed"]
            else RequestStatus.PARTIALLY_MATCHED
        )
        self.repository.update(
            "blood_requests",
            "request_id",
            str(request_id),
            {"bags_committed": bags, "status": status.value},
        )
        self.repository.insert(
            "notifications",
            {
                "user_id": request["requester_id"],
                "type": NotificationType.REQUEST_ACCEPTED.value,
                "title": "A donor accepted your request",
                "message": "Open your request to track commitment progress.",
                "payload": {"requestId": str(request_id), "donorId": str(donor_id)},
            },
        )

    def _record_completed_donation(self, commitment: dict[str, Any]) -> None:
        request = self._request(UUID(commitment["request_id"]))
        donation = self.repository.insert(
            "donations",
            {
                "commitment_id": commitment["commitment_id"],
                "donor_id": commitment["donor_id"],
                "request_id": request["request_id"],
                "hospital_id": request["hospital_id"],
                "bags_donated": 1,
                "lives_helped_estimate": 3,
            },
        )
        self.repository.insert(
            "activity_events",
            {
                "user_id": commitment["donor_id"],
                "category": ActivityCategory.DONATION.value,
                "status": "completed",
                "title": "Blood donation completed",
                "subtitle": f"{request['blood_group']} donation",
                "bags": 1,
                "occurred_at": donation["completed_at"],
            },
        )
        self.repository.update(
            "users",
            "user_id",
            commitment["donor_id"],
            {"last_donation_at": donation["completed_at"]},
        )
