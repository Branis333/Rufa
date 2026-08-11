import os
from collections.abc import Iterator
from datetime import datetime, timezone
from typing import Any
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

os.environ["APP_ENV"] = "test"
os.environ["SUPABASE_URL"] = "https://example.supabase.co"
os.environ["SUPABASE_SECRET_KEY"] = "sb_secret_test_key_for_isolated_tests"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-that-is-at-least-32-characters"

from database import (
    UserAlreadyExistsError,
    get_user_repository,
)
from main import app
from models.user import User


class InMemoryUserRepository:
    def __init__(self) -> None:
        self.users: dict[UUID, User] = {}

    def get_by_email(self, email: str) -> User | None:
        return next((user for user in self.users.values() if user.email == email), None)

    def get_by_id(self, user_id: UUID) -> User | None:
        return self.users.get(user_id)

    def create(self, data: dict[str, Any]) -> User:
        if self.get_by_email(data["email"]) is not None:
            raise UserAlreadyExistsError

        now = datetime.now(timezone.utc)
        user = User(
            user_id=uuid4(),
            **data,
            is_active=True,
            is_verified=False,
            created_at=now,
            updated_at=now,
        )
        self.users[user.user_id] = user
        return user


@pytest.fixture
def users() -> InMemoryUserRepository:
    return InMemoryUserRepository()


@pytest.fixture
def client(users: InMemoryUserRepository) -> Iterator[TestClient]:
    app.dependency_overrides[get_user_repository] = lambda: users
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
