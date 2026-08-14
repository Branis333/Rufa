from dataclasses import dataclass, field
from typing import Any
from uuid import UUID

from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder


@dataclass
class Connection:
    user_id: UUID
    channels: set[str] = field(default_factory=set)


class RealtimeHub:
    def __init__(self) -> None:
        self.connections: dict[WebSocket, Connection] = {}
        self.channels: dict[str, set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: UUID) -> None:
        await websocket.accept()
        connection = Connection(user_id=user_id)
        self.connections[websocket] = connection
        self.subscribe(websocket, f"user:{user_id}")

    def subscribe(self, websocket: WebSocket, channel: str) -> None:
        self.connections[websocket].channels.add(channel)
        self.channels.setdefault(channel, set()).add(websocket)

    def unsubscribe(self, websocket: WebSocket, channel: str) -> None:
        connection = self.connections.get(websocket)
        if connection:
            connection.channels.discard(channel)
        members = self.channels.get(channel)
        if members:
            members.discard(websocket)
            if not members:
                self.channels.pop(channel, None)

    def disconnect(self, websocket: WebSocket) -> None:
        connection = self.connections.pop(websocket, None)
        if connection:
            for channel in tuple(connection.channels):
                members = self.channels.get(channel)
                if members:
                    members.discard(websocket)
                    if not members:
                        self.channels.pop(channel, None)

    async def broadcast(self, channel: str, event: dict[str, Any]) -> None:
        payload = jsonable_encoder({"channel": channel, **event})
        disconnected: list[WebSocket] = []
        for websocket in tuple(self.channels.get(channel, set())):
            try:
                await websocket.send_json(payload)
            except RuntimeError:
                disconnected.append(websocket)
        for websocket in disconnected:
            self.disconnect(websocket)


realtime_hub = RealtimeHub()
