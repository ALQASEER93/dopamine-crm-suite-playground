from __future__ import annotations

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models  # noqa: F401  # ensure SQLAlchemy metadata is populated
from core.db import Base
from models.crm import Role, User
from services.startup_bootstrap_admin import maybe_bootstrap_admin_on_startup


def _make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def _active_admins(db):
    return (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.slug == "admin", User.is_active.is_(True))
        .all()
    )


def test_startup_bootstrap_disabled_is_noop_even_if_creds_present():
    db = _make_session()

    env = {
        "DPM_BOOTSTRAP_ADMIN_ON_STARTUP": "false",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": "bootstrap_admin@dpm.test",
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": "Secret12345!",
        "DPM_BOOTSTRAP_ADMIN_NAME": "Bootstrap Admin",
    }

    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []


def test_startup_bootstrap_enabled_creates_first_admin():
    db = _make_session()

    env = {
        "DPM_BOOTSTRAP_ADMIN_ON_STARTUP": "true",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": "bootstrap_admin@dpm.test",
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": "Secret12345!",
        "DPM_BOOTSTRAP_ADMIN_NAME": "Bootstrap Admin",
    }

    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is not None
    assert getattr(r, "created") is True

    admins = _active_admins(db)
    assert len(admins) == 1
    assert admins[0].email == "bootstrap_admin@dpm.test"


def test_startup_bootstrap_enabled_requires_email_and_password():
    db = _make_session()

    with pytest.raises(RuntimeError, match="DPM_BOOTSTRAP_ADMIN_EMAIL"):
        maybe_bootstrap_admin_on_startup(
            db,
            env={
                "DPM_BOOTSTRAP_ADMIN_ON_STARTUP": "1",
                "DPM_BOOTSTRAP_ADMIN_PASSWORD": "Secret12345!",
            },
        )

    with pytest.raises(RuntimeError, match="DPM_BOOTSTRAP_ADMIN_PASSWORD"):
        maybe_bootstrap_admin_on_startup(
            db,
            env={
                "DPM_BOOTSTRAP_ADMIN_ON_STARTUP": "1",
                "DPM_BOOTSTRAP_ADMIN_EMAIL": "bootstrap_admin@dpm.test",
            },
        )

