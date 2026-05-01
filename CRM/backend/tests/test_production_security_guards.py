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


def test_seed_admin_and_rep_does_not_seed_users_in_production(monkeypatch):
    db = _make_session()
    monkeypatch.setattr(auth_service.settings, "app_env", "production")
    monkeypatch.setattr(auth_service.settings, "seed_default_users", False)

    auth_service.seed_admin_and_rep(db)

    assert db.query(User).count() == 0
    assert db.query(Role).count() > 0
