from datetime import datetime

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_reports_api_is_available() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["service"] == "rufa-backend"
    datetime.fromisoformat(response.json()["timestamp"].replace("Z", "+00:00"))


def test_unknown_routes_return_json_404() -> None:
    response = client.get("/api/unknown")

    assert response.status_code == 404
    assert response.json() == {
        "error": {"message": "Route not found: GET /api/unknown"}
    }


def test_security_headers_are_present() -> None:
    response = client.get("/api/health")

    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
