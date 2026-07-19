from __future__ import annotations

import uuid

import jwt
import pytest
from fastapi.testclient import TestClient

from core.config import settings
from core.db import SessionLocal
from models.crm import Role, User


def _headers_for_role(slug: str) -> dict[str, str]:
    with SessionLocal() as db:
        role = db.query(Role).filter(Role.slug == slug).first()
        if not role:
            role = Role(slug=slug, name=slug.replace("_", " ").title())
            db.add(role)
            db.flush()

        user = User(
            name=f"{slug} test user",
            email=f"{slug}.{uuid.uuid4().hex[:8]}@example.com",
            password_hash="not-used-in-test",
            role_id=role.id,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        token = jwt.encode({"sub": str(user.id)}, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("role_slug", ["admin", "sales_manager", "manager", "medical_rep"])
def test_today_route_allows_intended_roles(client: TestClient, role_slug: str) -> None:
    resp = client.get("/api/v1/routes/today", headers=_headers_for_role(role_slug))

    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


@pytest.mark.parametrize("role_slug", ["auditor", "unknown"])
def test_today_route_forbids_unprivileged_authenticated_roles(client: TestClient, role_slug: str) -> None:
    resp = client.get("/api/v1/routes/today", headers=_headers_for_role(role_slug))

    assert resp.status_code == 403, resp.text
    assert resp.json()["detail"] == "Insufficient permissions."
