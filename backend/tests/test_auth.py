from fastapi.testclient import TestClient

USER_DATA = {
    "fname": "Ada",
    "lname": "Lovelace",
    "email": "Ada@example.com",
    "password": "StrongPassword123!",
    "phone_number": "+44 20 1234 5678",
    "blood_group": "O+",
    "location": "London",
    "date_of_birth": "1990-12-10",
}


def test_signup_creates_user_without_exposing_password(client: TestClient) -> None:
    response = client.post("/api/auth/signup", json=USER_DATA)

    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "ada@example.com"
    assert body["roles"] == ["user"]
    assert body["isActive"] is True
    assert "userId" in body
    assert "password" not in body
    assert "password_hash" not in body


def test_signup_stores_argon2_hash_instead_of_password(
    client: TestClient, users
) -> None:
    client.post("/api/auth/signup", json=USER_DATA)

    user = users.get_by_email("ada@example.com")

    assert user is not None
    assert user.password_hash != USER_DATA["password"]
    assert user.password_hash.startswith("$argon2")


def test_duplicate_email_is_rejected(client: TestClient) -> None:
    client.post("/api/auth/signup", json=USER_DATA)

    response = client.post("/api/auth/signup", json=USER_DATA)

    assert response.status_code == 409
    assert response.json()["error"]["message"] == (
        "An account with this email already exists."
    )


def test_login_returns_token_that_can_access_current_user(
    client: TestClient,
) -> None:
    client.post("/api/auth/signup", json=USER_DATA)

    login_response = client.post(
        "/api/auth/login",
        json={"email": "ADA@example.com", "password": USER_DATA["password"]},
    )

    assert login_response.status_code == 200
    token = login_response.json()["accessToken"]
    assert login_response.json()["tokenType"] == "bearer"

    me_response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "ada@example.com"


def test_invalid_credentials_are_rejected(client: TestClient) -> None:
    client.post("/api/auth/signup", json=USER_DATA)

    response = client.post(
        "/api/auth/login",
        json={"email": USER_DATA["email"], "password": "WrongPassword123!"},
    )

    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password."


def test_current_user_requires_bearer_token(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"
