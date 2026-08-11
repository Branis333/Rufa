from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from postgrest.exceptions import APIError

from database import UserAlreadyExistsError, UserRepository


def user_record() -> dict:
    return {
        "user_id": str(uuid4()),
        "fname": "Ada",
        "lname": "Lovelace",
        "email": "ada@example.com",
        "password_hash": "$argon2id$example",
        "phone_number": None,
        "blood_group": "O+",
        "location": "London",
        "date_of_birth": "1990-12-10",
        "roles": ["user"],
        "is_active": True,
        "is_verified": False,
        "created_at": "2026-08-11T08:00:00Z",
        "updated_at": "2026-08-11T08:00:00Z",
    }


def test_repository_maps_supabase_user_response() -> None:
    client = MagicMock()
    query = client.table.return_value.select.return_value.eq.return_value.limit
    query.return_value.execute.return_value = SimpleNamespace(data=[user_record()])

    user = UserRepository(client).get_by_email("ada@example.com")

    assert user is not None
    assert user.email == "ada@example.com"
    assert user.roles == ["user"]


def test_repository_maps_unique_constraint_error() -> None:
    client = MagicMock()
    client.table.return_value.insert.return_value.execute.side_effect = APIError(
        {
            "code": "23505",
            "message": "duplicate key",
            "hint": None,
            "details": None,
        }
    )

    with pytest.raises(UserAlreadyExistsError):
        UserRepository(client).create({"email": "ada@example.com"})
