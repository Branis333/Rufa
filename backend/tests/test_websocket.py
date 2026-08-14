import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect


def signup_and_token(client: TestClient) -> tuple[str, str]:
    signup = client.post(
        "/api/auth/signup",
        json={
            "username": "Realtime User",
            "email": "realtime@example.com",
            "password": "StrongPassword123!",
            "bloodGroup": "O+",
        },
    )
    login = client.post(
        "/api/auth/login",
        json={
            "email": "realtime@example.com",
            "password": "StrongPassword123!",
        },
    )
    return signup.json()["userId"], login.json()["accessToken"]


def test_websocket_auth_ping_and_channel_authorization(
    client: TestClient,
) -> None:
    user_id, token = signup_and_token(client)
    with client.websocket_connect(f"/api/ws/v1?token={token}") as websocket:
        connected = websocket.receive_json()
        assert connected["type"] == "connected"

        websocket.send_json({"type": "ping"})
        assert websocket.receive_json() == {"type": "pong"}

        websocket.send_json({"type": "subscribe", "channel": f"user:{user_id}"})
        assert websocket.receive_json()["type"] == "subscribed"

        websocket.send_json(
            {
                "type": "subscribe",
                "channel": "user:00000000-0000-0000-0000-000000000001",
            }
        )
        assert websocket.receive_json()["type"] == "error"


def test_websocket_rejects_missing_token(client: TestClient) -> None:
    with (
        pytest.raises(WebSocketDisconnect) as error,
        client.websocket_connect("/api/ws/v1"),
    ):
        pass
    assert error.value.code == 4401
