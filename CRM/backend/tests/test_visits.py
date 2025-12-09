from __future__ import annotations

from datetime import date


def test_create_visit(client, auth_headers):
    doctors = client.get("/api/v1/doctors", headers=auth_headers).json()["data"]
    if doctors:
        doctor_id = doctors[0]["id"]
    else:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. Visit", "specialty": "GP", "area": "Central"},
        )
        doctor_id = doctor_resp.json()["id"]

    reps_resp = client.get("/api/v1/reps", headers=auth_headers)
    assert reps_resp.status_code == 200, reps_resp.text
    rep_id = reps_resp.json()[0]["id"]

    visit_resp = client.post(
        "/api/v1/visits",
        headers=auth_headers,
        json={
            "visit_date": date.today().isoformat(),
            "rep_id": rep_id,
            "doctor_id": doctor_id,
            "notes": "Follow-up",
        },
    )
    assert visit_resp.status_code == 201, visit_resp.text
    created = visit_resp.json()
    assert created["doctor_id"] == doctor_id
