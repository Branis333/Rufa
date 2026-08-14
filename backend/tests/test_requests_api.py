from fastapi.testclient import TestClient


def auth_headers(
    client: TestClient,
    *,
    email: str,
    blood_group: str,
    name: str,
) -> dict[str, str]:
    password = "StrongPassword123!"
    response = client.post(
        "/api/auth/signup",
        json={
            "username": name,
            "email": email,
            "password": password,
            "bloodGroup": blood_group,
        },
    )
    assert response.status_code == 201
    login = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert login.status_code == 200
    return {"Authorization": f"Bearer {login.json()['accessToken']}"}


def create_request(
    client: TestClient,
    repository,
    headers: dict[str, str],
) -> dict:
    response = client.post(
        "/api/requests",
        headers=headers,
        json={
            "hospitalId": repository.hospital_id,
            "recipientDisplayName": "Patient A",
            "bloodGroup": "A+",
            "bagsNeeded": 1,
            "urgency": "Critical",
            "recipientCoordinates": {"lat": 0.34789, "lng": 32.58256},
            "searchRadiusKm": 25,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_request_commitment_lifecycle_and_side_effects(
    client: TestClient,
    repository,
) -> None:
    requester = auth_headers(
        client,
        email="requester@example.com",
        blood_group="AB+",
        name="Request Owner",
    )
    donor = auth_headers(
        client,
        email="donor@example.com",
        blood_group="O+",
        name="Donor One",
    )
    request = create_request(client, repository, requester)

    accept = client.post(
        f"/api/requests/{request['requestId']}/accept",
        headers=donor,
    )
    assert accept.status_code == 201, accept.text
    commitment_id = accept.json()["commitmentId"]

    duplicate = client.post(
        f"/api/requests/{request['requestId']}/accept",
        headers=donor,
    )
    assert duplicate.status_code == 409

    eligibility = client.post(
        f"/api/requests/{request['requestId']}/eligibility",
        headers=donor,
        json={
            "answers": {
                "recent_donation": False,
                "illness": False,
                "medication": False,
                "tattoo": False,
                "weight": True,
            }
        },
    )
    assert eligibility.status_code == 200, eligibility.text
    assert eligibility.json()["eligible"] is True

    for next_status in ("moving", "arrived", "completed"):
        update = client.patch(
            f"/api/requests/commitments/{commitment_id}/status",
            headers=donor,
            json={"status": next_status},
        )
        assert update.status_code == 200, update.text

    donations = client.get("/api/donations", headers=donor)
    assert donations.status_code == 200
    assert donations.json()[0]["bagsDonated"] == 1

    progress = client.get(
        f"/api/requests/{request['requestId']}/commitments",
        headers=requester,
    )
    assert progress.status_code == 200
    assert progress.json()["bagsCommitted"] == 1


def test_requester_only_actions_enforce_ownership(
    client: TestClient,
    repository,
) -> None:
    requester = auth_headers(
        client,
        email="owner@example.com",
        blood_group="A+",
        name="Owner",
    )
    outsider = auth_headers(
        client,
        email="outsider@example.com",
        blood_group="O-",
        name="Outsider",
    )
    request = create_request(client, repository, requester)

    response = client.post(
        f"/api/requests/{request['requestId']}/cancel",
        headers=outsider,
    )
    assert response.status_code == 403


def test_nearby_request_hides_precise_coordinates_from_non_participants(
    client: TestClient,
    repository,
) -> None:
    requester = auth_headers(
        client,
        email="coordinate-owner@example.com",
        blood_group="A+",
        name="Coordinate Owner",
    )
    observer = auth_headers(
        client,
        email="observer@example.com",
        blood_group="O+",
        name="Observer",
    )
    create_request(client, repository, requester)

    response = client.get(
        "/api/requests/nearby?lat=0.35&lng=32.58",
        headers=observer,
    )
    assert response.status_code == 200, response.text
    assert response.json()[0]["recipientCoordinates"] == {
        "lat": 0.35,
        "lng": 32.58,
    }
