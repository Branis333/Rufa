from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_current_user
from core.security import create_access_token, hash_password, verify_password
from database import (
    UserAlreadyExistsError,
    UserRepository,
    get_user_repository,
)
from models.user import User
from schemas.auth import LoginRequest, TokenResponse
from schemas.user import UserCreate, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def signup(
    data: UserCreate,
    users: Annotated[UserRepository, Depends(get_user_repository)],
) -> User:
    email = str(data.email).strip().lower()
    if users.get_by_email(email) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    try:
        return users.create(
            {
                "fname": data.fname,
                "lname": data.lname,
                "email": email,
                "password_hash": hash_password(data.password),
                "phone_number": (
                    data.phone_number.strip() if data.phone_number else None
                ),
                "blood_group": data.blood_group,
                "location": data.location,
                "date_of_birth": (
                    data.date_of_birth.isoformat() if data.date_of_birth else None
                ),
                "roles": ["user"],
            }
        )
    except UserAlreadyExistsError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        ) from error


@router.post("/login", response_model=TokenResponse)
def login(
    data: LoginRequest,
    users: Annotated[UserRepository, Depends(get_user_repository)],
) -> TokenResponse:
    email = str(data.email).strip().lower()
    user = users.get_by_email(email)

    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is disabled.",
        )

    return TokenResponse(access_token=create_access_token(user.user_id))


@router.get("/me", response_model=UserResponse)
def current_user(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    return user
