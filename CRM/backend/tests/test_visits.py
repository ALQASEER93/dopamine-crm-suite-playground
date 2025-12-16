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


def test_visits_summary_and_latest(client, auth_headers):
    summary_resp = client.get("/api/v1/visits/summary", headers=auth_headers)
    assert summary_resp.status_code == 200, summary_resp.text
    summary = summary_resp.json()

    for key in ("totalVisits", "completedVisits", "scheduledVisits", "cancelledVisits"):
        assert key in summary, summary

    latest_resp = client.get("/api/v1/visits/latest?pageSize=3", headers=auth_headers)
    assert latest_resp.status_code == 200, latest_resp.text
    payload = latest_resp.json()
    rows = payload.get("data") if isinstance(payload, dict) else payload
    assert isinstance(rows, list)
    if rows:
        first = rows[0]
        assert "visitDate" in first
        assert "status" in first
