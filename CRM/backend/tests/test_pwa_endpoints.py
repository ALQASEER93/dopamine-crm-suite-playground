from __future__ import annotations

import uuid

import jwt
from fastapi.testclient import TestClient

from core.config import settings
from core.db import SessionLocal
from models.crm import Role, User


def _mint_headers_for_role(slug: str) -> dict[str, str]:
    with SessionLocal() as db:
        role = db.query(Role).filter(Role.slug == slug).first()
        if not role:
            role = Role(slug=slug, name=slug.replace("_", " ").title())
            db.add(role)
            db.flush()

        email = f"{slug}.{uuid.uuid4().hex[:8]}@example.com"
        user = User(
            name=f"{slug} user",
            email=email,
            password_hash="not-used-in-test",
            role_id=role.id,
            is_active=True,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        token = jwt.encode({"sub": str(user.id)}, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return {"Authorization": f"Bearer {token}"}


def test_pwa_customers(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/pwa/customers", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


def test_pwa_visits_create(client: TestClient, auth_headers: dict[str, str]) -> None:
    doctors_resp = client.get("/api/v1/doctors", headers=auth_headers)
    assert doctors_resp.status_code == 200, doctors_resp.text
    doctors = doctors_resp.json().get("data", [])
    doctor_id = doctors[0]["id"] if doctors else None
    if not doctor_id:
        return

    payload = {
        "customerId": str(doctor_id),
        "customerName": doctors[0]["name"],
        "customerType": "doctor",
        "visitType": "follow-up",
    }
    resp = client.post("/api/v1/pwa/visits", json=payload, headers=auth_headers)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["customerId"] == str(doctor_id)


def test_pwa_visits_create_cannot_force_lifecycle(client: TestClient, auth_headers: dict[str, str]) -> None:
    doctors_resp = client.get("/api/v1/doctors", headers=auth_headers)
    assert doctors_resp.status_code == 200, doctors_resp.text
    doctors = doctors_resp.json().get("data", [])
    doctor_id = doctors[0]["id"] if doctors else None
    if not doctor_id:
        return

    payload = {
        "customerId": str(doctor_id),
        "customerName": doctors[0]["name"],
        "customerType": "doctor",
        "visitType": "follow-up",
        "status": "success",
        "coordinates": {"lat": 31.95, "lng": 35.91},
        "visitedAt": "2024-01-01T10:00:00+00:00",
    }
    resp = client.post("/api/v1/pwa/visits", json=payload, headers=auth_headers)
    assert resp.status_code == 400, resp.text
    assert "lifecycle" in resp.json()["detail"].lower()


def test_pwa_endpoints_forbid_unprivileged_role(client: TestClient) -> None:
    outsider_headers = _mint_headers_for_role("auditor")

    customers_resp = client.get("/api/v1/pwa/customers", headers=outsider_headers)
    assert customers_resp.status_code == 403, customers_resp.text

    tracking_resp = client.post("/api/v1/pwa/tracking/pings", headers=outsider_headers, json={"accuracy": 5})
    assert tracking_resp.status_code == 403, tracking_resp.text


def test_pwa_tracking_ping_reuses_gps_accuracy_policy(
    client: TestClient,
    rep_headers: dict[str, str],
    monkeypatch,
) -> None:
    monkeypatch.setattr(settings, "gps_min_accuracy_m", 5)

    bad = client.post("/api/v1/pwa/tracking/pings", headers=rep_headers, json={"accuracy": 50})
    assert bad.status_code == 400, bad.text
    assert "accuracy" in bad.json()["detail"].lower()

    ok = client.post("/api/v1/pwa/tracking/pings", headers=rep_headers, json={"accuracy": 3})
    assert ok.status_code == 200, ok.text
    assert ok.json() == {"success": True}
