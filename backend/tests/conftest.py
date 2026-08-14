from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import datetime, timezone
from typing import Any, ClassVar
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
from repositories.domain import get_domain_repository


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

    def update(self, user_id: UUID, data: dict[str, Any]) -> User:
        current = self.users[user_id]
        updated = current.model_copy(
            update={**data, "updated_at": datetime.now(timezone.utc)}
        )
        self.users[user_id] = updated
        return updated


class InMemoryDomainRepository:
    id_fields: ClassVar[dict[str, str]] = {
        "hospitals": "hospital_id",
        "blood_requests": "request_id",
        "request_commitments": "commitment_id",
        "eligibility_checks": "check_id",
        "donations": "donation_id",
        "activity_events": "activity_id",
        "notifications": "notification_id",
        "verification_applications": "application_id",
        "conversations": "conversation_id",
        "messages": "message_id",
        "contributions": "contribution_id",
        "push_tokens": "push_token_id",
    }

    def __init__(self) -> None:
        now = datetime.now(timezone.utc).isoformat()
        hospital_id = str(uuid4())
        self.tables: dict[str, list[dict[str, Any]]] = {
            "hospitals": [
                {
                    "hospital_id": hospital_id,
                    "name": "Test Hospital",
                    "address": "1 Test Way",
                    "city": "Test City",
                    "latitude": 0.35,
                    "longitude": 32.58,
                    "phone": None,
                    "is_active": True,
                    "created_at": now,
                }
            ]
        }

    @property
    def hospital_id(self) -> str:
        return self.tables["hospitals"][0]["hospital_id"]

    def get(
        self, table: str, id_field: str, value: str, *, select: str = "*"
    ) -> dict[str, Any] | None:
        del select
        return next(
            (
                row.copy()
                for row in self.tables.get(table, [])
                if str(row.get(id_field)) == str(value)
            ),
            None,
        )

    def find_one(
        self,
        table: str,
        *,
        filters: dict[str, Any],
        select: str = "*",
    ) -> dict[str, Any] | None:
        del select
        rows = self.list(table, filters=filters, limit=1)
        return rows[0] if rows else None

    def list(
        self,
        table: str,
        *,
        filters: dict[str, Any] | None = None,
        order_by: str = "created_at",
        descending: bool = True,
        limit: int = 25,
        cursor_field: str | None = None,
        cursor: str | None = None,
        select: str = "*",
    ) -> list[dict[str, Any]]:
        del select
        rows = [
            row.copy()
            for row in self.tables.get(table, [])
            if all(
                str(row.get(key)) == str(value)
                for key, value in (filters or {}).items()
            )
        ]
        if cursor and cursor_field:
            rows = [row for row in rows if row[cursor_field] < cursor]
        rows.sort(key=lambda row: row.get(order_by, ""), reverse=descending)
        return rows[:limit]

    def insert(self, table: str, data: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(timezone.utc).isoformat()
        row = data.copy()
        if table == "user_preferences":
            row = {
                "max_travel_radius_km": 25,
                "availability_status": "available",
                "notify_urgent_requests": True,
                "notify_request_updates": True,
                "notify_donation_reminders": True,
                "notify_chat_messages": True,
                **row,
            }
        id_field = self.id_fields.get(table)
        if id_field:
            row.setdefault(id_field, str(uuid4()))
        row.setdefault("created_at", now)
        row.setdefault("updated_at", now)
        defaults: dict[str, Any] = {
            "bags_committed": 0,
            "status": "open",
            "is_read": False,
            "read_at": None,
            "submitted_at": now,
            "completed_at": now,
            "occurred_at": now,
            "sent_at": now,
            "reviewed_at": None,
            "review_notes": None,
            "accepted_at": None,
            "moving_started_at": None,
            "arrived_at": None,
            "decline_reason": None,
            "last_latitude": None,
            "last_longitude": None,
            "eta_seconds": None,
        }
        for key, value in defaults.items():
            row.setdefault(key, value)
        self.tables.setdefault(table, []).append(row)
        return row.copy()

    def update(
        self,
        table: str,
        id_field: str,
        value: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        if table == "users":
            return {id_field: value, **data}
        for row in self.tables.get(table, []):
            if str(row.get(id_field)) == str(value):
                row.update(data)
                row["updated_at"] = datetime.now(timezone.utc).isoformat()
                return row.copy()
        raise AssertionError(f"Missing {table} row for update")

    def update_where(
        self,
        table: str,
        *,
        filters: dict[str, Any],
        data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        updated = []
        for row in self.tables.get(table, []):
            if all(str(row.get(key)) == str(value) for key, value in filters.items()):
                row.update(data)
                updated.append(row.copy())
        return updated

    def upsert(
        self,
        table: str,
        data: dict[str, Any],
        *,
        on_conflict: str,
    ) -> dict[str, Any]:
        existing = self.get(table, on_conflict, str(data[on_conflict]))
        if existing:
            return self.update(table, on_conflict, str(data[on_conflict]), data)
        return self.insert(table, data)

    def delete(self, table: str, *, filters: dict[str, Any]) -> list[dict[str, Any]]:
        removed = [
            row
            for row in self.tables.get(table, [])
            if all(str(row.get(key)) == str(value) for key, value in filters.items())
        ]
        self.tables[table] = [
            row for row in self.tables.get(table, []) if row not in removed
        ]
        return removed

    def count(self, table: str, *, filters: dict[str, Any] | None = None) -> int:
        return len(self.list(table, filters=filters, limit=10_000))

    def rpc(self, name: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        if name == "nearby_hospitals":
            return [
                {**row, "distance_km": 1.0} for row in self.tables.get("hospitals", [])
            ]
        if name == "nearby_blood_requests":
            return [
                {**row, "distance_km": 1.0}
                for row in self.tables.get("blood_requests", [])
                if row["status"] in {"open", "partially_matched"}
            ][: params.get("p_limit", 25)]
        if name == "search_compatible_donors":
            return []
        raise AssertionError(f"Unexpected RPC: {name}")


@pytest.fixture
def users() -> InMemoryUserRepository:
    return InMemoryUserRepository()


@pytest.fixture
def repository() -> InMemoryDomainRepository:
    return InMemoryDomainRepository()


@pytest.fixture
def client(
    users: InMemoryUserRepository,
    repository: InMemoryDomainRepository,
) -> Iterator[TestClient]:
    app.dependency_overrides[get_user_repository] = lambda: users
    app.dependency_overrides[get_domain_repository] = lambda: repository
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
