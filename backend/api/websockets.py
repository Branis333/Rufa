from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from core.enums import CommitmentStatus
from core.realtime import realtime_hub
from core.security import TokenError, decode_access_token
from database import UserRepository, get_user_repository
from repositories.domain import DomainRepository, get_domain_repository
from schemas.common import Coordinates

router = APIRouter(tags=["Realtime"])


def _authorized_channel(
    repository: DomainRepository,
    *,
    user_id: UUID,
    channel: str,
) -> bool:
    try:
        kind, raw_id = channel.split(":", maxsplit=1)
        resource_id = UUID(raw_id)
    except (ValueError, AttributeError):
        return False
    if kind == "user":
        return resource_id == user_id
    if kind == "request":
        request = repository.get("blood_requests", "request_id", str(resource_id))
        if request is None:
            return False
        if request["requester_id"] == str(user_id):
            return True
        return (
            repository.find_one(
                "request_commitments",
                filters={
                    "request_id": str(resource_id),
                    "donor_id": str(user_id),
                },
            )
            is not None
        )
    if kind == "commitment":
        commitment = repository.get(
            "request_commitments", "commitment_id", str(resource_id)
        )
        if commitment is None:
            return False
        request = repository.get(
            "blood_requests", "request_id", commitment["request_id"]
        )
        return commitment["donor_id"] == str(user_id) or (
            request is not None and request["requester_id"] == str(user_id)
        )
    if kind == "conversation":
        conversation = repository.get(
            "conversations", "conversation_id", str(resource_id)
        )
        return conversation is not None and str(user_id) in {
            conversation["requester_id"],
            conversation["donor_id"],
        }
    return False


async def _handle_location_update(
    websocket: WebSocket,
    repository: DomainRepository,
    *,
    user_id: UUID,
    frame: dict[str, Any],
) -> None:
    try:
        commitment_id = UUID(frame["commitmentId"])
        coordinates = Coordinates.model_validate(frame["coordinates"])
        eta_seconds = int(frame["etaSeconds"]) if "etaSeconds" in frame else None
    except (KeyError, TypeError, ValueError, ValidationError):
        await websocket.send_json(
            {"type": "error", "message": "Invalid location update."}
        )
        return
    commitment = repository.get(
        "request_commitments", "commitment_id", str(commitment_id)
    )
    if commitment is None or commitment["donor_id"] != str(user_id):
        await websocket.send_json({"type": "error", "message": "Forbidden."})
        return
    if commitment["status"] not in {
        CommitmentStatus.ACCEPTED.value,
        CommitmentStatus.MOVING.value,
    }:
        await websocket.send_json(
            {"type": "error", "message": "Commitment is not moving."}
        )
        return
    updated = repository.update(
        "request_commitments",
        "commitment_id",
        str(commitment_id),
        {
            "last_latitude": coordinates.lat,
            "last_longitude": coordinates.lng,
            "eta_seconds": eta_seconds,
        },
    )
    event = {"type": "movement.updated", "data": updated}
    await realtime_hub.broadcast(f"commitment:{commitment_id}", event)
    await realtime_hub.broadcast(f"request:{commitment['request_id']}", event)


@router.websocket("/ws/v1")
async def websocket_v1(
    websocket: WebSocket,
    users: Annotated[UserRepository, Depends(get_user_repository)],
    repository: Annotated[DomainRepository, Depends(get_domain_repository)],
    token: Annotated[str | None, Query()] = None,
) -> None:
    if token is None:
        await websocket.close(code=4401, reason="Missing access token.")
        return
    try:
        user_id = decode_access_token(token)
    except TokenError:
        await websocket.close(code=4401, reason="Invalid access token.")
        return
    user = users.get_by_id(user_id)
    if user is None or not user.is_active:
        await websocket.close(code=4401, reason="User is unavailable.")
        return

    await realtime_hub.connect(websocket, user_id)
    await websocket.send_json(
        {
            "type": "connected",
            "data": {"userId": str(user_id), "transport": "in-process"},
        }
    )
    try:
        while True:
            frame = await websocket.receive_json()
            frame_type = frame.get("type")
            if frame_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif frame_type in {"subscribe", "unsubscribe"}:
                channel = frame.get("channel")
                if not isinstance(channel, str) or not _authorized_channel(
                    repository, user_id=user_id, channel=channel
                ):
                    await websocket.send_json(
                        {"type": "error", "message": "Channel access denied."}
                    )
                    continue
                if frame_type == "subscribe":
                    realtime_hub.subscribe(websocket, channel)
                else:
                    realtime_hub.unsubscribe(websocket, channel)
                await websocket.send_json(
                    {"type": f"{frame_type}d", "channel": channel}
                )
            elif frame_type == "location.update":
                await _handle_location_update(
                    websocket,
                    repository,
                    user_id=user_id,
                    frame=frame,
                )
            elif frame_type == "typing":
                channel = frame.get("channel")
                if not isinstance(channel, str) or not _authorized_channel(
                    repository, user_id=user_id, channel=channel
                ):
                    await websocket.send_json(
                        {"type": "error", "message": "Channel access denied."}
                    )
                    continue
                await realtime_hub.broadcast(
                    channel,
                    {
                        "type": "conversation.typing",
                        "data": {"userId": str(user_id)},
                    },
                )
            else:
                await websocket.send_json(
                    {"type": "error", "message": "Unsupported frame type."}
                )
    except WebSocketDisconnect:
        realtime_hub.disconnect(websocket)
