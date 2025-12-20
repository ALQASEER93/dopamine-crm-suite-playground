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


def test_start_and_end_visit(client, auth_headers):
    doctors = client.get("/api/v1/doctors", headers=auth_headers).json()["data"]
    doctor_id = doctors[0]["id"] if doctors else None
    if not doctor_id:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. GPS", "specialty": "Internal", "area": "Central"},
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
            "notes": "GPS flow test",
        },
    )
    assert visit_resp.status_code == 201, visit_resp.text
    visit_id = visit_resp.json()["id"]

    start_resp = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"lat": 31.95, "lng": 35.91, "accuracy": 8.5},
    )
    assert start_resp.status_code == 200, start_resp.text
    started = start_resp.json()
    assert started["status"] == "in_progress"
    assert started["start_lat"] == 31.95

    end_resp = client.post(
        f"/api/v1/visits/{visit_id}/end",
        headers=auth_headers,
        json={"lat": 31.96, "lng": 35.94, "accuracy": 12.3},
    )
    assert end_resp.status_code == 200, end_resp.text
    ended = end_resp.json()
    assert ended["status"] == "completed"
    assert ended["end_lat"] == 31.96
    assert ended["duration_seconds"] is not None and ended["duration_seconds"] >= 0
