from datetime import datetime, timezone

from fastapi import APIRouter

from schemas.system import HealthResponse

router = APIRouter(tags=["System"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    timestamp = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    return HealthResponse(
        status="ok",
        service="rufa-backend",
        timestamp=timestamp.replace("+00:00", "Z"),
    )
