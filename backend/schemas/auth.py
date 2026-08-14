from pydantic import EmailStr, Field

from schemas.common import CamelModel


class LoginRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class TokenResponse(CamelModel):
    access_token: str
    token_type: str = "bearer"


class ForgotPasswordRequest(CamelModel):
    email: EmailStr


class ResetPasswordRequest(CamelModel):
    token: str = Field(min_length=32, max_length=512)
    password: str = Field(min_length=8, max_length=128)


class GoogleAuthRequest(CamelModel):
    id_token: str = Field(min_length=10, max_length=8192)
