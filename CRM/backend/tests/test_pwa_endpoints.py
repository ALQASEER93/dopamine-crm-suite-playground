from __future__ import annotations

from fastapi.testclient import TestClient


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
        "status": "success",
    }
    resp = client.post("/api/v1/pwa/visits", json=payload, headers=auth_headers)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["customerId"] == str(doctor_id)
