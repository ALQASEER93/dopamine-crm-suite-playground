from __future__ import annotations

import pytest

from config.settings import DEFAULT_DATABASE_URL, Settings, resolve_database_url


def _db_url(host: str, database: str, *, query: str | None = None) -> str:
    scheme = "postgresql"
    value = f"{scheme}://{host}:5432/{database}"
    if query:
        value = f"{value}?{query}"
    return value


DATABASE_URL = _db_url("primary.example.invalid", "dpm_primary")
PREVIEW_DATABASE_URL = _db_url("preview.example.invalid", "dpm_preview")
PROD_DATABASE_URL = _db_url("prod.example.invalid", "dpm_prod")
SAME_DATABASE_URL = _db_url("same.example.invalid", "dpm")


def test_development_database_url_wins_when_present() -> None:
    resolved_url, source = resolve_database_url(
        database_url=DATABASE_URL,
        preview_database_url=PREVIEW_DATABASE_URL,
        prod_database_url=PROD_DATABASE_URL,
        app_env="development",
        vercel_env=None,
        vercel_git_commit_ref=None,
    )

    assert resolved_url == DATABASE_URL
    assert source == "DATABASE_URL"


def test_preview_uses_preview_database_url_when_present() -> None:
    settings = Settings(
        DATABASE_URL=DATABASE_URL,
        PREVIEW_DATABASE_URL=PREVIEW_DATABASE_URL,
        PROD_DATABASE_URL=PROD_DATABASE_URL,
        VERCEL_ENV="preview",
    )

    assert settings.database_url == PREVIEW_DATABASE_URL
    assert settings.database_url_source == "PREVIEW_DATABASE_URL"


def test_preview_uses_preview_database_url_when_dpm_env_is_production() -> None:
    settings = Settings(
        DPM_ENV="production",
        JWT_SECRET="StrongProductionSecret123!",
        ALLOWED_ORIGINS="https://crm.example.com",
        ALLOW_DEV_TOKEN_ENDPOINT=False,
        ALLOW_DEV_TOKEN=False,
        DATABASE_URL=PROD_DATABASE_URL,
        PREVIEW_DATABASE_URL=PREVIEW_DATABASE_URL,
        PROD_DATABASE_URL=PROD_DATABASE_URL,
        VERCEL_ENV="preview",
    )

    assert settings.database_url == PREVIEW_DATABASE_URL
    assert settings.database_url_source == "PREVIEW_DATABASE_URL"


def test_preview_branch_fallback_uses_preview_database_url() -> None:
    settings = Settings(
        DATABASE_URL="",
        PREVIEW_DATABASE_URL=PREVIEW_DATABASE_URL,
        PROD_DATABASE_URL=PROD_DATABASE_URL,
        VERCEL_GIT_COMMIT_REF="codex/field-ready-completion",
    )

    assert settings.database_url == PREVIEW_DATABASE_URL
    assert settings.database_url_source == "PREVIEW_DATABASE_URL"


def test_preview_app_env_fallback_uses_preview_database_url() -> None:
    settings = Settings(
        DPM_ENV="vercel-preview",
        DATABASE_URL="",
        PREVIEW_DATABASE_URL=PREVIEW_DATABASE_URL,
        PROD_DATABASE_URL=PROD_DATABASE_URL,
    )

    assert settings.database_url == PREVIEW_DATABASE_URL
    assert settings.database_url_source == "PREVIEW_DATABASE_URL"


def test_preview_fails_closed_when_only_prod_database_url_is_present() -> None:
    with pytest.raises(ValueError, match="PREVIEW_DATABASE_URL"):
        Settings(
            DATABASE_URL="",
            PREVIEW_DATABASE_URL="",
            PROD_DATABASE_URL=PROD_DATABASE_URL,
            VERCEL_ENV="preview",
        )


def test_fallback_blocks_if_preview_database_url_equals_prod_database_url() -> None:
    with pytest.raises(ValueError, match="not isolated"):
        Settings(
            DATABASE_URL="",
            PREVIEW_DATABASE_URL=SAME_DATABASE_URL,
            PROD_DATABASE_URL=SAME_DATABASE_URL,
            VERCEL_ENV="preview",
        )


def test_preview_fails_closed_when_database_url_equals_production_without_preview_url() -> None:
    with pytest.raises(ValueError, match="PREVIEW_DATABASE_URL"):
        Settings(
            DATABASE_URL=PROD_DATABASE_URL,
            PREVIEW_DATABASE_URL="",
            PROD_DATABASE_URL=PROD_DATABASE_URL,
            VERCEL_ENV="preview",
        )


def test_production_never_uses_preview_database_url() -> None:
    settings = Settings(
        DPM_ENV="production",
        JWT_SECRET="StrongProductionSecret123!",
        ALLOWED_ORIGINS="https://crm.example.com",
        ALLOW_DEV_TOKEN_ENDPOINT=False,
        ALLOW_DEV_TOKEN=False,
        DATABASE_URL="",
        PREVIEW_DATABASE_URL=PREVIEW_DATABASE_URL,
        PROD_DATABASE_URL=PROD_DATABASE_URL,
        VERCEL_ENV="production",
    )

    assert settings.database_url == PROD_DATABASE_URL
    assert settings.database_url_source == "PROD_DATABASE_URL"


def test_production_preserves_database_url_precedence() -> None:
    settings = Settings(
        DPM_ENV="production",
        JWT_SECRET="StrongProductionSecret123!",
        ALLOWED_ORIGINS="https://crm.example.com",
        ALLOW_DEV_TOKEN_ENDPOINT=False,
        ALLOW_DEV_TOKEN=False,
        DATABASE_URL=DATABASE_URL,
        PREVIEW_DATABASE_URL=PREVIEW_DATABASE_URL,
        PROD_DATABASE_URL=PROD_DATABASE_URL,
        VERCEL_ENV="production",
    )

    assert settings.database_url == DATABASE_URL
    assert settings.database_url_source == "DATABASE_URL"


def test_development_default_sqlite_behavior_is_preserved() -> None:
    resolved_url, source = resolve_database_url(
        database_url=DEFAULT_DATABASE_URL,
        preview_database_url=None,
        prod_database_url=None,
        app_env="development",
        vercel_env=None,
        vercel_git_commit_ref=None,
    )

    assert resolved_url == DEFAULT_DATABASE_URL
    assert source == "DATABASE_URL"


def test_resolver_errors_do_not_include_secret_values() -> None:
    sensitive_value = _db_url(
        "sensitive-user:secret-password@preview.example.invalid",
        "dpm",
        query="credential=do-not-print",
    )

    with pytest.raises(ValueError) as exc_info:
        Settings(
            DATABASE_URL="",
            PREVIEW_DATABASE_URL=sensitive_value,
            PROD_DATABASE_URL=sensitive_value,
            VERCEL_ENV="preview",
        )

    message = str(exc_info.value)
    assert sensitive_value not in message
    assert "do-not-print" not in message
    assert "sensitive-user" not in message
    assert "secret-password" not in message
    assert "preview.example.invalid" not in message
