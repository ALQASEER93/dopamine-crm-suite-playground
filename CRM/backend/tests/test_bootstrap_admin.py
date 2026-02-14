from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import models  # noqa: F401  # ensure SQLAlchemy metadata is populated
from core.db import Base
from models.crm import Role, User
from services.auth import ensure_bootstrap_admin_user


def _make_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    return sessionmaker(bind=engine, autocommit=False, autoflush=False)()


def test_bootstrap_admin_idempotent_same_email():
    db = _make_session()

    r1 = ensure_bootstrap_admin_user(
        db,
        email="bootstrap_admin@dpm.test",
        name="Bootstrap Admin",
        password="Secret12345!",
    )
    r2 = ensure_bootstrap_admin_user(
        db,
        email="bootstrap_admin@dpm.test",
        name="Bootstrap Admin",
        password="Secret12345!",
    )

    assert r1.email == "bootstrap_admin@dpm.test"
    assert r2.email == "bootstrap_admin@dpm.test"

    users = db.query(User).filter(User.email == "bootstrap_admin@dpm.test").all()
    assert len(users) == 1

    admin_role = db.query(Role).filter(Role.slug == "admin").first()
    assert admin_role is not None
    assert users[0].role_id == admin_role.id


def test_bootstrap_admin_noop_if_other_admin_exists():
    db = _make_session()

    # Create first admin.
    ensure_bootstrap_admin_user(db, email="admin1@dpm.test", name="A1", password="Secret12345!")

    # Attempt to create a second one should be a no-op.
    r = ensure_bootstrap_admin_user(db, email="admin2@dpm.test", name="A2", password="Secret12345!")
    assert r.created is False

    admins = (
        db.query(User)
        .join(Role, User.role_id == Role.id)
        .filter(Role.slug == "admin", User.is_active.is_(True))
        .all()
    )
    assert len(admins) == 1

