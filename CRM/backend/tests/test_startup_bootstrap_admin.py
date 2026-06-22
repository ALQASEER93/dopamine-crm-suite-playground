from __future__ import annotations

import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models  # noqa: F401  # ensure SQLAlchemy metadata is populated
from core.db import Base
from models.crm import Role, User
from services.auth import seed_default_roles
from services.startup_bootstrap_admin import maybe_bootstrap_admin_on_startup

BOOTSTRAP_TEST_PASSWORD = "X" * 12
BOOTSTRAP_TEST_EMAIL = "bootstrap_admin@dpm.test"
BOOTSTRAP_TEST_NAME = "Bootstrap Test Operator"
STARTUP_BOOTSTRAP_LOGGER = "services.startup_bootstrap_admin"


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


def _startup_bootstrap_log_text(caplog) -> str:
    return "\n".join(
        record.getMessage() for record in caplog.records if record.name == STARTUP_BOOTSTRAP_LOGGER
    )


def _assert_no_sensitive_startup_bootstrap_logs(caplog, *values: str) -> str:
    log_text = _startup_bootstrap_log_text(caplog)
    for value in values:
        assert value not in log_text
    assert "Missing required env var" not in log_text
    assert "DPM_BOOTSTRAP_ADMIN" not in log_text
    return log_text


def test_startup_bootstrap_disabled_is_noop_even_if_creds_present(caplog):
    db = _make_session()

    env = {
        "DPM_ENV": "development",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "false",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": BOOTSTRAP_TEST_EMAIL,
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
        "DPM_BOOTSTRAP_ADMIN_NAME": BOOTSTRAP_TEST_NAME,
    }

    caplog.set_level(logging.INFO, logger=STARTUP_BOOTSTRAP_LOGGER)
    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []
    log_text = _assert_no_sensitive_startup_bootstrap_logs(
        caplog,
        BOOTSTRAP_TEST_EMAIL,
        BOOTSTRAP_TEST_PASSWORD,
        BOOTSTRAP_TEST_NAME,
        env["DPM_ENV"],
    )
    assert "Startup admin bootstrap skipped by safe guard." in log_text


def test_startup_bootstrap_enabled_creates_first_admin(caplog):
    db = _make_session()

    env = {
        "DPM_ENV": "development",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "true",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": BOOTSTRAP_TEST_EMAIL,
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
        "DPM_BOOTSTRAP_ADMIN_NAME": BOOTSTRAP_TEST_NAME,
    }

    caplog.set_level(logging.INFO, logger=STARTUP_BOOTSTRAP_LOGGER)
    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is not None
    assert getattr(r, "created") is True

    admins = _active_admins(db)
    assert len(admins) == 1
    assert admins[0].email == BOOTSTRAP_TEST_EMAIL
    log_text = _assert_no_sensitive_startup_bootstrap_logs(
        caplog,
        BOOTSTRAP_TEST_EMAIL,
        BOOTSTRAP_TEST_PASSWORD,
        BOOTSTRAP_TEST_NAME,
        env["DPM_ENV"],
    )
    assert "Startup admin bootstrap completed in allowed local environment." in log_text


def test_startup_bootstrap_enabled_requires_email_and_password(caplog):
    db = _make_session()
    caplog.set_level(logging.INFO, logger=STARTUP_BOOTSTRAP_LOGGER)

    r1 = maybe_bootstrap_admin_on_startup(
        db,
        env={
            "DPM_ENV": "development",
            "DPM_BOOTSTRAP_ADMIN_ONCE": "1",
            "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
        },
    )
    assert r1 is None
    assert _active_admins(db) == []
    _assert_no_sensitive_startup_bootstrap_logs(
        caplog,
        BOOTSTRAP_TEST_PASSWORD,
        "development",
    )

    caplog.clear()
    r2 = maybe_bootstrap_admin_on_startup(
        db,
        env={
            "DPM_ENV": "development",
            "DPM_BOOTSTRAP_ADMIN_ONCE": "1",
            "DPM_BOOTSTRAP_ADMIN_EMAIL": BOOTSTRAP_TEST_EMAIL,
        },
    )
    assert r2 is None
    assert _active_admins(db) == []
    _assert_no_sensitive_startup_bootstrap_logs(caplog, BOOTSTRAP_TEST_EMAIL, "development")


def test_startup_bootstrap_is_local_development_only(caplog):
    db = _make_session()
    env = {
        "DPM_ENV": "production",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "true",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": BOOTSTRAP_TEST_EMAIL,
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
    }
    caplog.set_level(logging.INFO, logger=STARTUP_BOOTSTRAP_LOGGER)
    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []
    _assert_no_sensitive_startup_bootstrap_logs(
        caplog,
        BOOTSTRAP_TEST_EMAIL,
        BOOTSTRAP_TEST_PASSWORD,
        env["DPM_ENV"],
    )


def test_startup_bootstrap_refuses_vercel_preview_even_if_enabled(caplog):
    db = _make_session()
    env = {
        "DPM_ENV": "development",
        "VERCEL_ENV": "preview",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "true",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": BOOTSTRAP_TEST_EMAIL,
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
    }
    caplog.set_level(logging.INFO, logger=STARTUP_BOOTSTRAP_LOGGER)
    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []
    _assert_no_sensitive_startup_bootstrap_logs(
        caplog,
        BOOTSTRAP_TEST_EMAIL,
        BOOTSTRAP_TEST_PASSWORD,
        env["DPM_ENV"],
        env["VERCEL_ENV"],
    )


def test_startup_bootstrap_refuses_vercel_production_even_if_enabled(caplog):
    db = _make_session()
    env = {
        "DPM_ENV": "development",
        "VERCEL_ENV": "production",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "true",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": BOOTSTRAP_TEST_EMAIL,
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
    }
    caplog.set_level(logging.INFO, logger=STARTUP_BOOTSTRAP_LOGGER)
    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []
    _assert_no_sensitive_startup_bootstrap_logs(
        caplog,
        BOOTSTRAP_TEST_EMAIL,
        BOOTSTRAP_TEST_PASSWORD,
        env["DPM_ENV"],
        env["VERCEL_ENV"],
    )


def test_startup_bootstrap_requires_no_existing_users(caplog):
    db = _make_session()
    roles = seed_default_roles(db)
    db.add(
        User(
            email="existing-user@dpm.test",
            name="Existing User",
            role_id=roles["medical_rep"].id,
            is_active=True,
            password_hash="not-used-in-test",
        )
    )
    db.commit()

    env = {
        "DPM_ENV": "development",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "true",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": BOOTSTRAP_TEST_EMAIL,
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
        "DPM_BOOTSTRAP_ADMIN_NAME": BOOTSTRAP_TEST_NAME,
    }
    caplog.set_level(logging.INFO, logger=STARTUP_BOOTSTRAP_LOGGER)
    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []
    log_text = _assert_no_sensitive_startup_bootstrap_logs(
        caplog,
        BOOTSTRAP_TEST_EMAIL,
        BOOTSTRAP_TEST_PASSWORD,
        BOOTSTRAP_TEST_NAME,
        env["DPM_ENV"],
    )
    assert "Startup admin bootstrap skipped by safe guard." in log_text
