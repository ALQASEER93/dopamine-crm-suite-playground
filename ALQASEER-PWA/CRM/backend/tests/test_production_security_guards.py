from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models  # noqa: F401  # ensure SQLAlchemy metadata is populated
from config.settings import Settings
from core.db import Base
from models.crm import Role, User
from services import auth as auth_service


def _make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_production_rejects_weak_jwt_secret():
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(
            DPM_ENV="production",
            JWT_SECRET="change-me",
            ALLOWED_ORIGINS="https://crm.example.com",
        )


def test_production_rejects_insecure_allowed_origins():
    with pytest.raises(ValueError, match="ALLOWED_ORIGINS"):
        Settings(
            DPM_ENV="production",
            JWT_SECRET="StrongProductionSecret123!",
            ALLOWED_ORIGINS="http://crm.example.com",
        )


def test_production_rejects_seed_default_users_enabled():
    with pytest.raises(ValueError, match="SEED_DEFAULT_USERS"):
        Settings(
            DPM_ENV="production",
            JWT_SECRET="StrongProductionSecret123!",
            ALLOWED_ORIGINS="https://crm.example.com",
            seed_default_users=True,
        )


def test_production_rejects_sqlite_database_url():
    with pytest.raises(ValueError, match="managed PostgreSQL"):
        Settings(
            DPM_ENV="production",
            JWT_SECRET="StrongProductionSecret123!",
            ALLOWED_ORIGINS="https://crm.example.com",
            ALLOW_DEV_TOKEN_ENDPOINT=False,
            ALLOW_DEV_TOKEN=False,
            DATABASE_URL="sqlite:///./data/fastapi.db",
        )


def test_production_rejects_legacy_erp_api_enablement():
    with pytest.raises(ValueError, match="DPM_ENABLE_LEGACY_ERP_API"):
        Settings(
            DPM_ENV="production",
            JWT_SECRET="StrongProductionSecret123!",
            ALLOWED_ORIGINS="https://crm.example.com",
            ALLOW_DEV_TOKEN_ENDPOINT=False,
            ALLOW_DEV_TOKEN=False,
            DATABASE_URL="postgresql://user:pass@db.example.com:5432/defaultdb?sslmode=require",
            DPM_ENABLE_LEGACY_ERP_API=True,
        )


def test_production_trims_crlf_env_values_before_parsing():
    settings = Settings(
        DPM_ENV="production\r\n",
        JWT_SECRET="StrongProductionSecret123!\r\n",
        ALLOWED_ORIGINS="https://crm.example.com\r\n",
        ALLOW_DEV_TOKEN_ENDPOINT="false\r\n",
        ALLOW_DEV_TOKEN="false\r\n",
        GEOFENCE_ENABLED="true\r\n",
        DATABASE_URL="postgresql://user:pass@db.example.com:5432/defaultdb?sslmode=require\r\n",
    )

    assert settings.allow_dev_token_endpoint is False
    assert settings.allow_dev_token is False
    assert settings.geofence_enabled is True
    assert settings.database_url == "postgresql://user:pass@db.example.com:5432/defaultdb?sslmode=require"


def test_seed_admin_and_rep_does_not_seed_users_in_production(monkeypatch):
    db = _make_session()
    monkeypatch.setattr(auth_service.settings, "app_env", "production")
    monkeypatch.setattr(auth_service.settings, "seed_default_users", False)

    auth_service.seed_admin_and_rep(db)

    assert db.query(User).count() == 0
    assert db.query(Role).count() > 0
