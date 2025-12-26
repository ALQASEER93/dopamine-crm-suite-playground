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
    jwt_secret: str = "development-secret"
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60
    debug: bool = False
    app_version: str = "1.0.0"
    seed_default_users: bool | None = None
    bootstrap_code: str | None = None
    gps_max_distance_m: float = Field(default=100.0, validation_alias="GPS_MAX_DISTANCE_M")
    gps_min_accuracy_m: float = Field(default=80.0, validation_alias="GPS_MIN_ACCURACY_M")
    geofence_radius_m: float = Field(default=120.0, validation_alias="GEOFENCE_RADIUS_M")

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

    def model_post_init(self, __context: dict[str, object] | None = None) -> None:
        """Apply environment-specific overrides after loading settings."""
        env = (self.app_env or "").lower()
        if env == "production":
            if self.prod_database_url:
                object.__setattr__(self, "database_url", self.prod_database_url)
            if self.prod_echo_sql is not None:
                object.__setattr__(self, "echo_sql", self.prod_echo_sql)
            if self.seed_default_users is None:
                object.__setattr__(self, "seed_default_users", False)
        elif self.seed_default_users is None:
            object.__setattr__(self, "seed_default_users", True)


settings = Settings()
