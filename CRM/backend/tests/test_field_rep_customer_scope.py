from __future__ import annotations

from datetime import date
import uuid

import jwt

from core.config import settings
from core.db import SessionLocal
from models.crm import Doctor, Pharmacy, Role, Route, RouteAccount, User


def _build_scoped_rep_fixture() -> tuple[dict[str, str], dict[str, int]]:
    marker = uuid.uuid4().hex[:10]
    with SessionLocal() as db:
        role = db.query(Role).filter(Role.slug == "medical_rep").one()
        rep = User(
            name="Scoped Test Representative",
            email=f"scoped-rep-{marker}@example.invalid",
            password_hash="test-only-not-used",
            role_id=role.id,
            is_active=True,
        )
        other_rep = User(
            name="Other Test Representative",
            email=f"other-rep-{marker}@example.invalid",
            password_hash="test-only-not-used",
            role_id=role.id,
            is_active=True,
        )
        assigned_doctor = Doctor(name=f"Synthetic Assigned Doctor {marker}", city="Test City")
        unassigned_doctor = Doctor(name=f"Synthetic Unassigned Doctor {marker}", city="Test City")
        unassigned_pharmacy = Pharmacy(name=f"Synthetic Unassigned Pharmacy {marker}", city="Test City")
        db.add_all([rep, other_rep, assigned_doctor, unassigned_doctor, unassigned_pharmacy])
        db.flush()

        route = Route(name=f"Synthetic Scoped Route {marker}", rep_id=rep.id, frequency="monthly")
        other_route = Route(name=f"Synthetic Other Route {marker}", rep_id=other_rep.id, frequency="monthly")
        db.add_all([route, other_route])
        db.flush()
        db.add(
            RouteAccount(
                route_id=route.id,
                account_type="doctor",
                doctor_id=assigned_doctor.id,
                visit_frequency="monthly",
            )
        )
        db.commit()

        token = jwt.encode(
            {"sub": str(rep.id)},
            settings.jwt_secret,
            algorithm=settings.jwt_algorithm,
        )
        ids = {
            "rep": rep.id,
            "other_rep": other_rep.id,
            "assigned_doctor": assigned_doctor.id,
            "unassigned_doctor": unassigned_doctor.id,
            "unassigned_pharmacy": unassigned_pharmacy.id,
            "route": route.id,
            "other_route": other_route.id,
        }
    return {"Authorization": f"Bearer {token}"}, ids


def test_medical_rep_customer_and_visit_scope(client) -> None:
    headers, ids = _build_scoped_rep_fixture()

    doctors_response = client.get("/api/v1/doctors", headers=headers)
    assert doctors_response.status_code == 200, doctors_response.text
    doctor_ids = {item["id"] for item in doctors_response.json()["data"]}
    assert ids["assigned_doctor"] in doctor_ids
    assert ids["unassigned_doctor"] not in doctor_ids

    assert client.get(
        f"/api/v1/doctors/{ids['unassigned_doctor']}", headers=headers
    ).status_code == 403

    pwa_response = client.get("/api/v1/pwa/customers", headers=headers)
    assert pwa_response.status_code == 200, pwa_response.text
    pwa_keys = {(item["type"], int(item["id"])) for item in pwa_response.json()}
    assert ("doctor", ids["assigned_doctor"]) in pwa_keys
    assert ("doctor", ids["unassigned_doctor"]) not in pwa_keys
    assert ("pharmacy", ids["unassigned_pharmacy"]) not in pwa_keys

    create_response = client.post(
        "/api/v1/visits",
        headers=headers,
        json={
            "visit_date": date.today().isoformat(),
            "rep_id": ids["rep"],
            "doctor_id": ids["unassigned_doctor"],
        },
    )
    assert create_response.status_code == 403, create_response.text

    pwa_create_response = client.post(
        "/api/v1/pwa/visits",
        headers=headers,
        json={
            "customerId": str(ids["unassigned_doctor"]),
            "customerName": "Synthetic Test Customer",
            "customerType": "doctor",
            "visitType": "follow-up",
        },
    )
    assert pwa_create_response.status_code == 403, pwa_create_response.text


def test_medical_rep_cannot_mutate_customer_master_or_browse_other_reps(client) -> None:
    headers, ids = _build_scoped_rep_fixture()

    assert client.post(
        "/api/v1/doctors",
        headers=headers,
        json={"name": "Synthetic Unauthorized Doctor"},
    ).status_code == 403
    assert client.post(
        "/api/v1/pharmacies",
        headers=headers,
        json={"name": "Synthetic Unauthorized Pharmacy"},
    ).status_code == 403

    reps_response = client.get("/api/v1/reps", headers=headers)
    assert reps_response.status_code == 200, reps_response.text
    assert {item["id"] for item in reps_response.json()} == {ids["rep"]}
    assert client.get(f"/api/v1/reps/{ids['other_rep']}", headers=headers).status_code == 403

    routes_response = client.get("/api/v1/routes", headers=headers)
    assert routes_response.status_code == 200, routes_response.text
    assert {item["id"] for item in routes_response.json()["data"]} == {ids["route"]}
    assert client.get(f"/api/v1/routes/{ids['other_route']}", headers=headers).status_code == 403
