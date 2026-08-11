from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: Literal["development", "test", "production"] = "development"
    supabase_url: str = Field(pattern=r"^https://")
    supabase_secret_key: str = Field(
        min_length=20,
        pattern=r"^(sb_secret_|eyJ)",
    )
    jwt_secret_key: str = Field(min_length=32)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = Field(default=60, ge=5, le=10080)
    cors_origins: str = "*"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        origins = [
            origin.strip() for origin in self.cors_origins.split(",") if origin.strip()
        ]
        if not origins:
            raise ValueError("CORS_ORIGINS must contain at least one origin.")
        return origins


@lru_cache
def get_settings() -> Settings:
    return Settings()
