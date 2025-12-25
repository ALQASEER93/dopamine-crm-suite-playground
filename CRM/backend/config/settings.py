from __future__ import annotations

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = Field("development", validation_alias="DPM_ENV")
    app_name: str = "ALQASEER CRM API"
    database_url: str = "sqlite:///./data/fastapi.db"
    prod_database_url: str | None = None
    echo_sql: bool = False
    prod_echo_sql: bool | None = None
    jwt_secret: str = Field(
        default="development-secret",
        validation_alias="JWT_SECRET",
        description="JWT secret key for token signing. Must be set in production.",
    )
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60
    debug: bool = False
    app_version: str = "1.0.0"
    seed_default_users: bool | None = None
    bootstrap_code: str | None = None
    default_admin_email: str = Field("admin@example.com", validation_alias="DEFAULT_ADMIN_EMAIL")
    default_admin_password: str | None = Field(default=None, validation_alias="DEFAULT_ADMIN_PASSWORD")
    default_admin_reset: bool | None = Field(default=None, validation_alias="DEFAULT_ADMIN_RESET")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("seed_default_users", mode="before")
    @classmethod
    def normalize_seed_flag(cls, value):  # noqa: ANN001
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "y"}:
                return True
            if normalized in {"false", "0", "no", "n"}:
                return False
        return value

    @field_validator("bootstrap_code", mode="before")
    @classmethod
    def normalize_bootstrap_code(cls, value):  # noqa: ANN001
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("default_admin_reset", mode="before")
    @classmethod
    def normalize_admin_reset(cls, value):  # noqa: ANN001
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "y"}:
                return True
            if normalized in {"false", "0", "no", "n"}:
                return False
        return value

    def model_post_init(self, __context: dict[str, object] | None = None) -> None:
        """Apply environment-specific overrides after loading settings."""
        env = (self.app_env or "").lower()
        if env == "production":
            # Require JWT_SECRET in production
            if self.jwt_secret == "development-secret":
                import os
                if not os.getenv("JWT_SECRET"):
                    raise ValueError(
                        "JWT_SECRET must be set in production. "
                        "Set JWT_SECRET environment variable with a strong random secret."
                    )
            
            if self.prod_database_url:
                object.__setattr__(self, "database_url", self.prod_database_url)
            if self.prod_echo_sql is not None:
                object.__setattr__(self, "echo_sql", self.prod_echo_sql)
            if self.seed_default_users is None:
                object.__setattr__(self, "seed_default_users", False)
        elif self.seed_default_users is None:
            object.__setattr__(self, "seed_default_users", True)


settings = Settings()
