from __future__ import annotations

import logging
from uuid import uuid4

from fastapi import FastAPI
from fastapi.exceptions import ResponseValidationError
from fastapi.testclient import TestClient

from core.db import SessionLocal
from main import response_validation_exception_handler
from models.crm import Role, User


def _ensure_user(*, role_slug: str, email: str) -> None:
    with SessionLocal() as db:
        role = db.query(Role).filter(Role.slug == role_slug).first()
        if not role:
            role = Role(slug=role_slug, name=role_slug.replace("_", " ").title())
            db.add(role)
            db.flush()

        user = db.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name=f"{role_slug} local output test",
                email=email,
                password_hash="not-used-in-test",
                role_id=role.id,
                is_active=True,
            )
            db.add(user)
        db.commit()


def test_reps_output_allows_existing_local_domain_emails(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    email = f"local-rep-output-{uuid4().hex[:8]}@dpm.local"
    _ensure_user(role_slug="medical_rep", email=email)

    response = client.get("/api/v1/reps", headers=auth_headers)

    assert response.status_code == 200, response.text
    assert any(rep["email"] == email for rep in response.json())


def test_admin_users_output_allows_existing_local_domain_emails(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    email = f"local-admin-output-{uuid4().hex[:8]}@dpm.test"
    _ensure_user(role_slug="admin", email=email)

    response = client.get("/api/v1/admin/users", headers=auth_headers)

    assert response.status_code == 200, response.text
    assert any(user["email"] == email for user in response.json())


def test_response_validation_handler_redacts_sensitive_inputs(caplog) -> None:
    app = FastAPI()
    app.add_exception_handler(ResponseValidationError, response_validation_exception_handler)

    sensitive_email = "raw.credential@dpm.test"

    @app.get("/broken", response_model=dict[str, int])
    def broken_response() -> dict[str, str]:
        return {"secret": sensitive_email}

    caplog.set_level(logging.ERROR, logger="main")

    response = TestClient(app, raise_server_exceptions=False).get("/broken")

    assert response.status_code == 500
    assert response.json() == {"detail": "Internal response validation error."}
    assert sensitive_email not in response.text
    assert sensitive_email not in caplog.text
    assert "path=/broken" in caplog.text
