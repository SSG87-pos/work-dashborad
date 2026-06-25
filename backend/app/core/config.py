from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "local"
    app_name: str = "work-dashboard-api"
    api_host: str = "0.0.0.0"
    api_port: int = 18080

    database_url: str = Field(
        default="postgresql+psycopg://work_dashboard_user:CHANGE_ME@127.0.0.1:5432/work_dashboard"
    )

    jwt_secret: str = "CHANGE_TO_LONG_RANDOM_VALUE_AT_LEAST_32_BYTES"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 14

    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:10097",
            "http://127.0.0.1:10097",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ]
    )

    first_admin_email: str = "seulgis@posco.com"
    first_admin_name: str = "소슬기"
    first_admin_title: str = "수석"
    first_admin_password: str = "CHANGE_ME_BEFORE_SEED"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
