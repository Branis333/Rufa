from api.websockets import router as websocket_router
from main import app


def test_frontend_contract_routes_are_registered() -> None:
    paths = set(app.openapi()["paths"])
    expected = {
        "/api/auth/signup",
        "/api/auth/login",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/google",
        "/api/auth/logout",
        "/api/users/me",
        "/api/users/me/preferences",
        "/api/users/me/location",
        "/api/users/me/stats",
        "/api/users/me/push-token",
        "/api/hospitals",
        "/api/requests",
        "/api/requests/nearby",
        "/api/requests/mine",
        "/api/requests/{request_id}",
        "/api/requests/{request_id}/cancel",
        "/api/requests/{request_id}/eligibility",
        "/api/requests/{request_id}/accept",
        "/api/requests/{request_id}/decline",
        "/api/requests/{request_id}/commitments",
        "/api/requests/commitments/{commitment_id}/status",
        "/api/donors/search",
        "/api/donors/direct-request",
        "/api/donations",
        "/api/activity",
        "/api/activity/summary",
        "/api/notifications",
        "/api/verification/request",
        "/api/verification/status",
        "/api/conversations",
        "/api/conversations/{conversation_id}/messages",
        "/api/contributions",
    }
    assert expected <= paths
    assert any(route.path == "/ws/v1" for route in websocket_router.routes)
