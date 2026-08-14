from __future__ import annotations

from typing import Any

from httpx import HTTPError
from postgrest.exceptions import APIError

from core.exceptions import ConflictError, RepositoryError
from database import get_supabase_client
from supabase import Client


class DomainRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    @staticmethod
    def _raise(error: Exception) -> None:
        if isinstance(error, APIError) and error.code in {"23505", "23P01"}:
            raise ConflictError("The resource already exists or conflicts.") from error
        raise RepositoryError("Database service is unavailable.") from error

    def get(
        self, table: str, id_field: str, value: str, *, select: str = "*"
    ) -> dict[str, Any] | None:
        try:
            response = (
                self.client.table(table)
                .select(select)
                .eq(id_field, value)
                .limit(1)
                .execute()
            )
        except (APIError, HTTPError) as error:
            self._raise(error)
        return response.data[0] if response.data else None

    def find_one(
        self,
        table: str,
        *,
        filters: dict[str, Any],
        select: str = "*",
    ) -> dict[str, Any] | None:
        rows = self.list(table, filters=filters, limit=1, select=select)
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
        try:
            query = self.client.table(table).select(select)
            for key, value in (filters or {}).items():
                if value is not None:
                    query = query.eq(key, value)
            if cursor and cursor_field:
                query = query.lt(cursor_field, cursor)
            response = query.order(order_by, desc=descending).limit(limit).execute()
        except (APIError, HTTPError) as error:
            self._raise(error)
        return list(response.data or [])

    def insert(self, table: str, data: dict[str, Any]) -> dict[str, Any]:
        try:
            response = self.client.table(table).insert(data).execute()
        except (APIError, HTTPError) as error:
            self._raise(error)
        if not response.data:
            raise RepositoryError("Database did not return the created resource.")
        return response.data[0]

    def update(
        self,
        table: str,
        id_field: str,
        value: str,
        data: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            response = (
                self.client.table(table).update(data).eq(id_field, value).execute()
            )
        except (APIError, HTTPError) as error:
            self._raise(error)
        if not response.data:
            raise RepositoryError("Database did not return the updated resource.")
        return response.data[0]

    def update_where(
        self,
        table: str,
        *,
        filters: dict[str, Any],
        data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        try:
            query = self.client.table(table).update(data)
            for key, value in filters.items():
                query = query.eq(key, value)
            response = query.execute()
        except (APIError, HTTPError) as error:
            self._raise(error)
        return list(response.data or [])

    def upsert(
        self,
        table: str,
        data: dict[str, Any],
        *,
        on_conflict: str,
    ) -> dict[str, Any]:
        try:
            response = (
                self.client.table(table).upsert(data, on_conflict=on_conflict).execute()
            )
        except (APIError, HTTPError) as error:
            self._raise(error)
        if not response.data:
            raise RepositoryError("Database did not return the upserted resource.")
        return response.data[0]

    def delete(self, table: str, *, filters: dict[str, Any]) -> list[dict[str, Any]]:
        try:
            query = self.client.table(table).delete()
            for key, value in filters.items():
                query = query.eq(key, value)
            response = query.execute()
        except (APIError, HTTPError) as error:
            self._raise(error)
        return list(response.data or [])

    def count(self, table: str, *, filters: dict[str, Any] | None = None) -> int:
        try:
            query = self.client.table(table).select("*", count="exact", head=True)
            for key, value in (filters or {}).items():
                query = query.eq(key, value)
            response = query.execute()
        except (APIError, HTTPError) as error:
            self._raise(error)
        return response.count or 0

    def rpc(self, name: str, params: dict[str, Any]) -> list[dict[str, Any]]:
        try:
            response = self.client.rpc(name, params).execute()
        except (APIError, HTTPError) as error:
            self._raise(error)
        return list(response.data or [])


def get_domain_repository() -> DomainRepository:
    return DomainRepository(get_supabase_client())
