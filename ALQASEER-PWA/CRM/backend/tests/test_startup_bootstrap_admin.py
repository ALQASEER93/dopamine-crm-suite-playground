from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models  # noqa: F401  # ensure SQLAlchemy metadata is populated
from core.db import Base
from models.crm import Role, User
from services.auth import seed_default_roles
from services.startup_bootstrap_admin import maybe_bootstrap_admin_on_startup

BOOTSTRAP_TEST_PASSWORD = "X" * 12


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
        "DPM_ENV": "development",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "false",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": "bootstrap_admin@dpm.test",
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
        "DPM_BOOTSTRAP_ADMIN_NAME": "Bootstrap Admin",
    }

    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []


def test_startup_bootstrap_enabled_creates_first_admin():
    db = _make_session()

    env = {
        "DPM_ENV": "development",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "true",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": "bootstrap_admin@dpm.test",
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
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

    r2 = maybe_bootstrap_admin_on_startup(
        db,
        env={
            "DPM_ENV": "development",
            "DPM_BOOTSTRAP_ADMIN_ONCE": "1",
            "DPM_BOOTSTRAP_ADMIN_EMAIL": "bootstrap_admin@dpm.test",
        },
    )
    assert r2 is None
    assert _active_admins(db) == []


def test_startup_bootstrap_is_local_development_only():
    db = _make_session()
    env = {
        "DPM_ENV": "production",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "true",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": "bootstrap_admin@dpm.test",
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
    }
    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []


def test_startup_bootstrap_refuses_vercel_preview_even_if_enabled():
    db = _make_session()
    env = {
        "DPM_ENV": "development",
        "VERCEL_ENV": "preview",
        "DPM_BOOTSTRAP_ADMIN_ONCE": "true",
        "DPM_BOOTSTRAP_ADMIN_EMAIL": "bootstrap_admin@dpm.test",
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
    }
    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []


def test_startup_bootstrap_requires_no_existing_users():
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
        "DPM_BOOTSTRAP_ADMIN_EMAIL": "bootstrap_admin@dpm.test",
        "DPM_BOOTSTRAP_ADMIN_PASSWORD": BOOTSTRAP_TEST_PASSWORD,
        "DPM_BOOTSTRAP_ADMIN_NAME": "Bootstrap Admin",
    }
    r = maybe_bootstrap_admin_on_startup(db, env=env)
    assert r is None
    assert _active_admins(db) == []
