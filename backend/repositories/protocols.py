from __future__ import annotations

from typing import Any, Protocol


class DomainRepositoryProtocol(Protocol):
    def get(
        self, table: str, id_field: str, value: str, *, select: str = "*"
    ) -> dict[str, Any] | None: ...

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
    ) -> list[dict[str, Any]]: ...

    def insert(self, table: str, data: dict[str, Any]) -> dict[str, Any]: ...

    def update(
        self,
        table: str,
        id_field: str,
        value: str,
        data: dict[str, Any],
    ) -> dict[str, Any]: ...

    def upsert(
        self,
        table: str,
        data: dict[str, Any],
        *,
        on_conflict: str,
    ) -> dict[str, Any]: ...

    def rpc(self, name: str, params: dict[str, Any]) -> list[dict[str, Any]]: ...
