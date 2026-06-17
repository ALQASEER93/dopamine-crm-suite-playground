from __future__ import annotations

from typing import Annotated

from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

DEFAULT_DATABASE_URL = "sqlite:///./data/fastapi.db"
PREVIEW_DB_BRANCH = "codex/field-ready-completion"
PREVIEW_APP_ENVS = {"preview", "staging", "vercel-preview"}


def _clean_env_value(value: str | None) -> str:
    return (value or "").strip()


def _is_preview_runtime(
    *,
    app_env: str,
    vercel_env: str | None,
    vercel_git_commit_ref: str | None,
) -> bool:
    normalized_app_env = _clean_env_value(app_env).lower()
    normalized_vercel_env = _clean_env_value(vercel_env).lower()
    normalized_branch = _clean_env_value(vercel_git_commit_ref)

    return (
        normalized_vercel_env == "preview"
        or normalized_branch == PREVIEW_DB_BRANCH
        or normalized_app_env in PREVIEW_APP_ENVS
    )


def resolve_database_url(
    *,
    database_url: str | None,
    preview_database_url: str | None,
    prod_database_url: str | None,
    app_env: str,
    vercel_env: str | None,
    vercel_git_commit_ref: str | None,
) -> tuple[str, str]:
    """Resolve the effective DB URL without exposing secret values in errors."""
    db_url = _clean_env_value(database_url)
    preview_url = _clean_env_value(preview_database_url)
    prod_url = _clean_env_value(prod_database_url)
    normalized_app_env = _clean_env_value(app_env).lower()
    normalized_vercel_env = _clean_env_value(vercel_env).lower()

    if normalized_vercel_env == "production":
        if db_url and db_url != DEFAULT_DATABASE_URL:
            return db_url, "DATABASE_URL"
        if prod_url:
            return prod_url, "PROD_DATABASE_URL"
        if db_url:
            return db_url, "DATABASE_URL"
        raise ValueError("DATABASE_URL or PROD_DATABASE_URL is required in Vercel production.")

    preview_runtime = _is_preview_runtime(
        app_env=app_env,
        vercel_env=vercel_env,
        vercel_git_commit_ref=vercel_git_commit_ref,
    )

    if preview_runtime:
        if not preview_url:
            raise ValueError("PREVIEW_DATABASE_URL is required in Vercel Preview.")
        if not prod_url:
            raise ValueError("PROD_DATABASE_URL is required to validate Preview database isolation.")
        if preview_url == prod_url:
            raise ValueError("Preview database URL is not isolated from production database URL.")
        return preview_url, "PREVIEW_DATABASE_URL"

    if normalized_app_env == "production":
        if db_url and db_url != DEFAULT_DATABASE_URL:
            return db_url, "DATABASE_URL"
        if prod_url:
            return prod_url, "PROD_DATABASE_URL"
        if db_url:
            return db_url, "DATABASE_URL"
        raise ValueError("DATABASE_URL or PROD_DATABASE_URL is required in production.")

    if db_url:
        return db_url, "DATABASE_URL"

    raise ValueError("DATABASE_URL is required outside a verified Preview runtime.")


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
    database_url: str = Field(
        DEFAULT_DATABASE_URL,
        validation_alias=AliasChoices("DATABASE_URL", "SQLALCHEMY_DATABASE_URL"),
    )
    preview_database_url: str | None = Field(default=None, validation_alias="PREVIEW_DATABASE_URL")
    prod_database_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("PROD_DATABASE_URL", "PRODUCTION_DATABASE_URL"),
    )
    database_url_source: str = "DATABASE_URL"
    vercel_env: str | None = Field(default=None, validation_alias="VERCEL_ENV")
    vercel_git_commit_ref: str | None = Field(default=None, validation_alias="VERCEL_GIT_COMMIT_REF")
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
    allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=_default_allowed_origins,
        validation_alias="ALLOWED_ORIGINS",
    )
    allowed_origin_regex: str | None = Field(
        default=r"^https://dopamine-crm-frontend-playground(?:-[a-z0-9-]+)?\.vercel\.app$",
        validation_alias="ALLOWED_ORIGIN_REGEX",
    )
    gps_max_distance_m: float = Field(default=100.0, validation_alias="GPS_MAX_DISTANCE_M")
    gps_min_accuracy_m: float = Field(default=80.0, validation_alias="GPS_MIN_ACCURACY_M")
    allow_gps_override: bool | None = Field(default=None, validation_alias="ALLOW_GPS_OVERRIDE")
    allow_dev_token_endpoint: bool | None = Field(default=None, validation_alias="ALLOW_DEV_TOKEN_ENDPOINT")
    allow_dev_token: bool | None = Field(default=None, validation_alias="ALLOW_DEV_TOKEN")
    geofence_radius_m: float = Field(default=120.0, validation_alias="GEOFENCE_RADIUS_M")
    geofence_enabled: bool = Field(default=False, validation_alias="GEOFENCE_ENABLED")
    geofence_require_target_coords: bool | None = Field(default=None, validation_alias="GEOFENCE_REQUIRE_TARGET_COORDS")
    enable_legacy_erp_api: bool = Field(default=False, validation_alias="DPM_ENABLE_LEGACY_ERP_API")

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @field_validator("*", mode="before")
    @classmethod
    def strip_env_strings(cls, value):  # noqa: ANN001
        if isinstance(value, str):
            return value.strip()
        return value

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
        effective_database_url, database_url_source = resolve_database_url(
            database_url=self.database_url,
            preview_database_url=self.preview_database_url,
            prod_database_url=self.prod_database_url,
            app_env=self.app_env,
            vercel_env=self.vercel_env,
            vercel_git_commit_ref=self.vercel_git_commit_ref,
        )
        object.__setattr__(self, "database_url", effective_database_url)
        object.__setattr__(self, "database_url_source", database_url_source)
        if env == "production":
            if self.prod_echo_sql is not None:
                object.__setattr__(self, "echo_sql", self.prod_echo_sql)
            if bool(self.seed_default_users):
                raise ValueError("SEED_DEFAULT_USERS must be disabled when DPM_ENV=production.")
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
                if (
                    origin == "*"
                    or "localhost" in origin
                    or "127.0.0.1" in origin
                    or not origin.lower().startswith("https://")
                )
            }
            if restricted:
                raise ValueError(
                    "ALLOWED_ORIGINS in production must use trusted https origins only."
                )
            if bool(self.allow_dev_token_endpoint) or bool(self.allow_dev_token):
                raise ValueError(
                    "Dev token toggles must be disabled when DPM_ENV=production."
                )
            if bool(self.enable_legacy_erp_api):
                raise ValueError(
                    "DPM_ENABLE_LEGACY_ERP_API must stay disabled in production."
                )
            if self.database_url.strip().lower().startswith("sqlite"):
                raise ValueError("DATABASE_URL or PROD_DATABASE_URL must use managed PostgreSQL in production.")
            if self.allow_gps_override is None:
                object.__setattr__(self, "allow_gps_override", False)
            if self.geofence_require_target_coords is None:
                object.__setattr__(self, "geofence_require_target_coords", True)
        elif self.seed_default_users is None:
            object.__setattr__(self, "seed_default_users", True)
        if self.allow_dev_token_endpoint is None:
            object.__setattr__(self, "allow_dev_token_endpoint", False)
        if self.allow_dev_token is None:
            object.__setattr__(self, "allow_dev_token", False)
        if self.allow_gps_override is None:
            object.__setattr__(self, "allow_gps_override", True)
        if self.geofence_require_target_coords is None:
            object.__setattr__(self, "geofence_require_target_coords", False)
        if not self.jwt_secret:
            object.__setattr__(self, "jwt_secret", "development-secret")


settings = Settings()
