from functools import lru_cache
from typing import Any
from uuid import UUID

from httpx import HTTPError
from postgrest.exceptions import APIError
from supabase.client import ClientOptions

from core.config import get_settings
from models.user import User
from supabase import Client, create_client


class UserAlreadyExistsError(Exception):
    """Raised when a user email violates the unique constraint."""


class UserRepositoryError(Exception):
    """Raised when Supabase cannot complete a user operation."""


@lru_cache
def get_supabase_client() -> Client:
    settings = get_settings()
    return create_client(
        settings.supabase_url,
        settings.supabase_secret_key,
        options=ClientOptions(
            auto_refresh_token=False,
            persist_session=False,
            postgrest_client_timeout=10,
        ),
    )


class UserRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def get_by_email(self, email: str) -> User | None:
        try:
            response = (
                self.client.table("users")
                .select("*")
                .eq("email", email)
                .limit(1)
                .execute()
            )
        except (APIError, HTTPError) as error:
            raise UserRepositoryError from error
        return User.model_validate(response.data[0]) if response.data else None

    def get_by_id(self, user_id: UUID) -> User | None:
        try:
            response = (
                self.client.table("users")
                .select("*")
                .eq("user_id", str(user_id))
                .limit(1)
                .execute()
            )
        except (APIError, HTTPError) as error:
            raise UserRepositoryError from error
        return User.model_validate(response.data[0]) if response.data else None

    def create(self, data: dict[str, Any]) -> User:
        try:
            response = self.client.table("users").insert(data).execute()
        except APIError as error:
            if error.code == "23505":
                raise UserAlreadyExistsError from error
            raise UserRepositoryError from error
        except HTTPError as error:
            raise UserRepositoryError from error

        if not response.data:
            raise RuntimeError("Supabase did not return the created user.")
        return User.model_validate(response.data[0])


def get_user_repository() -> UserRepository:
    return UserRepository(get_supabase_client())
