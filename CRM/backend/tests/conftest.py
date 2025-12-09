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
test_db_path.parent.mkdir(parents=True, exist_ok=True)
for suffix in ("", "-journal"):
    candidate = Path(f"{test_db_path}{suffix}")
    if candidate.exists():
        try:
            candidate.unlink()
        except PermissionError:
            pass

from main import app, init_database  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def setup_database() -> None:
    """Ensure test database schema exists."""
    init_database()
    from core.db import SessionLocal, swap_engine, build_fallback_engine, Base  # noqa: WPS433

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
    payload = {"email": "admin@dopaminepharma.com", "password": "admin123"}
    resp = client.post("/api/v1/auth/login", json=payload)
    assert resp.status_code == 200, resp.text
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}
