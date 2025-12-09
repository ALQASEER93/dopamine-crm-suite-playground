from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def model_post_init(self, __context: dict[str, object] | None = None) -> None:
        """Apply environment-specific overrides after loading settings."""
        env = (self.app_env or "").lower()
        if env == "production":
            if self.prod_database_url:
                object.__setattr__(self, "database_url", self.prod_database_url)
            if self.prod_echo_sql is not None:
                object.__setattr__(self, "echo_sql", self.prod_echo_sql)


settings = Settings()
