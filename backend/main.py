import logging
import os
from datetime import datetime, timezone

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from starlette.exceptions import HTTPException

logger = logging.getLogger("rufa")

APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
if APP_ENV not in {"development", "test", "production"}:
    raise RuntimeError("APP_ENV must be development, test, or production.")

cors_value = os.getenv("CORS_ORIGINS", "*")
CORS_ORIGINS = [origin.strip() for origin in cors_value.split(",") if origin.strip()]
if not CORS_ORIGINS:
    raise RuntimeError("CORS_ORIGINS must contain at least one origin.")


class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str


app = FastAPI(
    title="Rufa Backend",
    description="Backend API for Rufa.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), microphone=()"
    return response


@app.get("/api/health", response_model=HealthResponse, tags=["System"])
async def health() -> HealthResponse:
    timestamp = datetime.now(timezone.utc).isoformat(timespec="milliseconds")
    return HealthResponse(
        status="ok",
        service="rufa-backend",
        timestamp=timestamp.replace("+00:00", "Z"),
    )


@app.exception_handler(HTTPException)
async def handle_http_error(request: Request, error: HTTPException) -> JSONResponse:
    if error.status_code == 404:
        path = request.url.path
        if request.url.query:
            path = f"{path}?{request.url.query}"
        message = f"Route not found: {request.method} {path}"
    else:
        message = str(error.detail)

    return JSONResponse(
        status_code=error.status_code,
        content={"error": {"message": message}},
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(_request: Request, error: Exception) -> JSONResponse:
    logger.exception("Unhandled request error", exc_info=error)
    message = "Internal server error" if APP_ENV == "production" else str(error)
    return JSONResponse(
        status_code=500,
        content={"error": {"message": message or "Internal server error"}},
    )
