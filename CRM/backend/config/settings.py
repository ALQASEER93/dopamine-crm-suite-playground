from __future__ import annotations

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_allowed_origins() -> list[str]:
    return [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:4174",
        "http://127.0.0.1:4174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
        "https://crm-dopamine.web.app",
        "https://dopamine-crm-suite-playground.onrender.com",
    ]


class Settings(BaseSettings):
    app_env: str = Field("development", validation_alias="DPM_ENV")
    app_name: str = "ALQASEER CRM API"
    database_url: str = "sqlite:///./data/fastapi.db"
    prod_database_url: str | None = None
    echo_sql: bool = False
    prod_echo_sql: bool | None = None
    jwt_secret: str | None = Field(default=None, validation_alias="JWT_SECRET")
    jwt_algorithm: str = "HS256"
    jwt_expires_minutes: int = 60
    jwt_issuer: str | None = Field(default=None, validation_alias="JWT_ISSUER")
    jwt_audience: str | None = Field(default=None, validation_alias="JWT_AUDIENCE")
    debug: bool = False
    app_version: str = "1.0.0"
    seed_default_users: bool | None = None
    bootstrap_code: str | None = None
    allowed_origins: list[str] = Field(default_factory=_default_allowed_origins, validation_alias="ALLOWED_ORIGINS")
    gps_max_distance_m: float = Field(default=100.0, validation_alias="GPS_MAX_DISTANCE_M")
    gps_min_accuracy_m: float = Field(default=80.0, validation_alias="GPS_MIN_ACCURACY_M")
    allow_gps_override: bool | None = Field(default=None, validation_alias="ALLOW_GPS_OVERRIDE")
    geofence_radius_m: float = Field(default=120.0, validation_alias="GEOFENCE_RADIUS_M")
    geofence_enabled: bool = Field(default=False, validation_alias="GEOFENCE_ENABLED")
    geofence_require_target_coords: bool | None = Field(default=None, validation_alias="GEOFENCE_REQUIRE_TARGET_COORDS")

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

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def normalize_allowed_origins(cls, value):  # noqa: ANN001
        if value is None:
            return _default_allowed_origins()
        if isinstance(value, str):
            parsed = [item.strip() for item in value.split(",") if item.strip()]
            return parsed or _default_allowed_origins()
        if isinstance(value, (list, tuple, set)):
            return [str(item).strip() for item in value if str(item).strip()]
        return value

    def model_post_init(self, __context: dict[str, object] | None = None) -> None:
        """Apply environment-specific overrides after loading settings."""
        env = (self.app_env or "").lower()
        if env == "production":
            if self.prod_database_url:
                object.__setattr__(self, "database_url", self.prod_database_url)
            if self.prod_echo_sql is not None:
                object.__setattr__(self, "echo_sql", self.prod_echo_sql)
            # Never auto-seed default users in production.
            object.__setattr__(self, "seed_default_users", False)
            secret = (self.jwt_secret or "").strip()
            weak_secrets = {"", "development-secret", "change-me", "changeme", "default-secret"}
            if secret.lower() in weak_secrets or len(secret) < 16:
                raise ValueError("JWT_SECRET is required and must be strong when DPM_ENV=production.")
            object.__setattr__(self, "jwt_secret", secret)
            restricted = {
                origin
                for origin in self.allowed_origins
                if origin == "*" or "localhost" in origin or "127.0.0.1" in origin
            }
            if restricted:
                raise ValueError(
                    "ALLOWED_ORIGINS in production must not include wildcard/local origins."
                )
            if self.allow_gps_override is None:
                object.__setattr__(self, "allow_gps_override", False)
            if self.geofence_require_target_coords is None:
                object.__setattr__(self, "geofence_require_target_coords", True)
        elif self.seed_default_users is None:
            object.__setattr__(self, "seed_default_users", True)
        if self.allow_gps_override is None:
            object.__setattr__(self, "allow_gps_override", True)
        if self.geofence_require_target_coords is None:
            object.__setattr__(self, "geofence_require_target_coords", False)
        if not self.jwt_secret:
            object.__setattr__(self, "jwt_secret", "development-secret")


settings = Settings()
