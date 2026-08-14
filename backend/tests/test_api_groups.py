from fastapi.testclient import TestClient


def authenticated_user(client: TestClient) -> dict[str, str]:
    client.post(
        "/api/auth/signup",
        json={
            "username": "API User",
            "email": "api-user@example.com",
            "password": "StrongPassword123!",
            "bloodGroup": "B+",
        },
    )
    login = client.post(
        "/api/auth/login",
        json={
            "email": "api-user@example.com",
            "password": "StrongPassword123!",
        },
    )
    return {"Authorization": f"Bearer {login.json()['accessToken']}"}


def test_profile_preferences_location_and_hospital_search(
    client: TestClient,
) -> None:
    headers = authenticated_user(client)
    preferences = client.patch(
        "/api/users/me/preferences",
        headers=headers,
        json={
            "maxTravelRadiusKm": 40,
            "availabilityStatus": "available",
        },
    )
    assert preferences.status_code == 200, preferences.text
    assert preferences.json()["maxTravelRadiusKm"] == 40

    location = client.put(
        "/api/users/me/location",
        headers=headers,
        json={
            "latitude": 0.35,
            "longitude": 32.58,
            "city": "Test City",
        },
    )
    assert location.status_code == 200, location.text
    assert location.json()["permissionGranted"] is True

    hospitals = client.get("/api/hospitals?q=Test")
    assert hospitals.status_code == 200
    assert hospitals.json()[0]["name"] == "Test Hospital"


def test_provider_neutral_endpoints_report_configuration(
    client: TestClient,
) -> None:
    forgot = client.post(
        "/api/auth/forgot-password",
        json={"email": "unknown@example.com"},
    )
    assert forgot.status_code == 202
    assert forgot.json()["configured"] is False

    google = client.post("/api/auth/google", json={"idToken": "x" * 20})
    assert google.status_code == 501
    assert "not configured" in google.json()["error"]["message"]


def test_verification_and_contribution_contracts(client: TestClient) -> None:
    headers = authenticated_user(client)
    verification = client.post(
        "/api/verification/request",
        headers=headers,
        json={
            "documentType": "national_id",
            "documentReference": "opaque-document-reference",
        },
    )
    assert verification.status_code == 201, verification.text
    assert verification.json()["status"] == "pending"

    contribution = client.post(
        "/api/contributions",
        headers=headers,
        json={"amountCents": 500, "currency": "usd"},
    )
    assert contribution.status_code == 201, contribution.text
    assert contribution.json()["providerConfigured"] is False
    assert contribution.json()["status"] == "pending"
