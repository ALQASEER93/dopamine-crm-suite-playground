from __future__ import annotations

import os
from pathlib import Path
import tempfile
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import OperationalError

tmp_dir = Path(tempfile.gettempdir())
test_db_path = tmp_dir / "crm_backend_pytest.db"
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path.as_posix()}"
os.environ["ALLOW_GPS_OVERRIDE"] = "true"
test_db_path.parent.mkdir(parents=True, exist_ok=True)
for suffix in ("", "-journal"):
    candidate = Path(f"{test_db_path}{suffix}")
    if candidate.exists():
        try:
            candidate.unlink()
        except PermissionError:
            pass

from main import app, init_database  # noqa: E402

# The imported application keeps these explicit test-only settings. Remove the
# environment overrides so isolated Settings() and subprocess security tests
# continue to exercise the field-safe defaults.
for test_only_setting in ("ALLOW_GPS_OVERRIDE",):
    os.environ.pop(test_only_setting, None)


@pytest.fixture(scope="session", autouse=True)
def setup_database() -> None:
    """Ensure test database schema exists."""
    init_database()
    from core.db import SessionLocal, swap_engine, build_fallback_engine, Base  # noqa: WPS433
    from models.crm import User  # noqa: WPS433
    from services.auth import hash_password, seed_default_roles  # noqa: WPS433
    from tests.qa_seed_data import seed_test_reference_data  # noqa: WPS433

    test_users = [
        ("admin@example.com", "Admin User", "admin", "Admin12345!"),
        ("sales_manager@example.com", "Sales Manager", "sales_manager", "Sales12345!"),
        ("rep1@example.com", "Medical Rep 1", "medical_rep", "Rep12345!"),
        ("rep2@example.com", "Medical Rep 2", "medical_rep", "Rep12345!"),
        ("rep3@example.com", "Medical Rep 3", "medical_rep", "Rep12345!"),
    ]
    with SessionLocal() as session:
        roles = seed_default_roles(session)
        for email, name, role_slug, password in test_users:
            if not session.query(User).filter(User.email == email).first():
                session.add(
                    User(
                        email=email,
                        name=name,
                        role_id=roles[role_slug].id,
                        is_active=True,
                        password_hash=hash_password(password),
                    )
                )
        session.commit()
        seed_test_reference_data(session)

    try:
        with SessionLocal() as session:
            session.execute(text("SELECT 1"))
            session.commit()
    except OperationalError:
        fallback = build_fallback_engine()
        swap_engine(fallback)
        Base.metadata.create_all(bind=fallback)


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers(client: TestClient) -> dict[str, str]:
    payload = {"email": "admin@example.com", "password": "Admin12345!"}
    resp = client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 200, resp.text
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}


def _login_headers(client: TestClient, *, email: str, password: str) -> dict[str, str]:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def manager_headers(client: TestClient) -> dict[str, str]:
    return _login_headers(client, email="sales_manager@example.com", password="Sales12345!")


@pytest.fixture
def rep_headers(client: TestClient) -> dict[str, str]:
    return _login_headers(client, email="rep1@example.com", password="Rep12345!")
