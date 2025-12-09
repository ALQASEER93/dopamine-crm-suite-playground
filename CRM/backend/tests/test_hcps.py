from __future__ import annotations

from uuid import uuid4


def test_create_doctor_and_pharmacy(client, auth_headers):
    unique_name = f"Dr. Test {uuid4().hex[:6]}"
    doctor_resp = client.post(
        "/api/v1/doctors",
        headers=auth_headers,
        json={
            "name": unique_name,
            "specialty": "Dermatology",
            "clinic": "Skin Clinic",
            "area": "West",
        },
    )
    assert doctor_resp.status_code == 201, doctor_resp.text
    doctor_id = doctor_resp.json()["id"]

    pharmacy_resp = client.post(
        "/api/v1/pharmacies",
        headers=auth_headers,
        json={
            "name": "Test Pharmacy",
            "city": "Amman",
            "segment": "Retail",
            "credit_limit": "1000.00",
        },
    )
    assert pharmacy_resp.status_code == 201, pharmacy_resp.text
    pharmacy_id = pharmacy_resp.json()["id"]

    list_doctors = client.get("/api/v1/doctors", headers=auth_headers)
    assert list_doctors.status_code == 200
    assert any(item["id"] == doctor_id for item in list_doctors.json()["data"])

    list_pharmacies = client.get("/api/v1/pharmacies", headers=auth_headers)
    assert list_pharmacies.status_code == 200
    assert any(item["id"] == pharmacy_id for item in list_pharmacies.json()["data"])
