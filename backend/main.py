import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException

from api.activity import router as activity_router
from api.auth import router as auth_router
from api.contributions import router as contributions_router
from api.conversations import router as conversations_router
from api.donors import router as donors_router
from api.health import router as health_router
from api.hospitals import router as hospitals_router
from api.notifications import router as notifications_router
from api.requests import router as requests_router
from api.users import router as users_router
from api.verification import router as verification_router
from api.websockets import router as websockets_router
from core.config import get_settings
from core.exceptions import AppError
from database import UserRepositoryError

logger = logging.getLogger("rufa")
settings = get_settings()

app = FastAPI(
    title="Rufa Backend",
    description="Backend API for Rufa.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
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


app.include_router(health_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(hospitals_router, prefix="/api")
app.include_router(requests_router, prefix="/api")
app.include_router(donors_router, prefix="/api")
app.include_router(activity_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(verification_router, prefix="/api")
app.include_router(conversations_router, prefix="/api")
app.include_router(contributions_router, prefix="/api")
app.include_router(websockets_router, prefix="/api")


@app.exception_handler(RequestValidationError)
async def handle_validation_error(
    _request: Request, _error: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={"error": {"message": "Invalid request data."}},
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
        headers=error.headers,
    )


@app.exception_handler(UserRepositoryError)
async def handle_repository_error(
    _request: Request, error: UserRepositoryError
) -> JSONResponse:
    logger.exception("Supabase user operation failed", exc_info=error)
    return JSONResponse(
        status_code=503,
        content={"error": {"message": "Database service is unavailable."}},
    )


@app.exception_handler(AppError)
async def handle_app_error(_request: Request, error: AppError) -> JSONResponse:
    if error.status_code >= 500:
        logger.exception("Application dependency failed", exc_info=error)
    return JSONResponse(
        status_code=error.status_code,
        content={"error": {"message": error.message}},
    )


@app.exception_handler(Exception)
async def handle_unexpected_error(_request: Request, error: Exception) -> JSONResponse:
    logger.exception("Unhandled request error", exc_info=error)
    message = (
        "Internal server error"
        if settings.app_env == "production"
        else str(error) or "Internal server error"
    )
    return JSONResponse(
        status_code=500,
        content={"error": {"message": message}},
    )
