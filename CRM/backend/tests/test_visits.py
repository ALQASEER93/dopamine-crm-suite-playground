from __future__ import annotations

from datetime import date, datetime, timedelta, timezone

import api.v1.visits as visits_api


def _create_basic_visit(client, auth_headers) -> int:
    doctors = client.get("/api/v1/doctors", headers=auth_headers).json()["data"]
    doctor_id = doctors[0]["id"]
    rep_id = client.get("/api/v1/reps", headers=auth_headers).json()[0]["id"]
    response = client.post(
        "/api/v1/visits",
        headers=auth_headers,
        json={"visit_date": date.today().isoformat(), "rep_id": rep_id, "doctor_id": doctor_id},
    )
    assert response.status_code == 201, response.text
    return response.json()["id"]


def test_lifecycle_rejects_future_client_timestamps(client, auth_headers):
    visit_id = _create_basic_visit(client, auth_headers)
    future_time = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()

    future_start = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"lat": 31.95, "lng": 35.91, "accuracy": 10.0, "started_at": future_time},
    )
    assert future_start.status_code == 400, future_start.text

    valid_start = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"lat": 31.95, "lng": 35.91, "accuracy": 10.0},
    )
    assert valid_start.status_code == 200, valid_start.text

    future_end = client.post(
        f"/api/v1/visits/{visit_id}/end",
        headers=auth_headers,
        json={"lat": 31.9501, "lng": 35.9101, "accuracy": 10.0, "ended_at": future_time},
    )
    assert future_end.status_code == 400, future_end.text


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
        json={"lat": 31.9504, "lng": 35.9104, "accuracy": 12.3},
    )
    assert end_resp.status_code == 200, end_resp.text
    ended = end_resp.json()
    assert ended["status"] == "completed"
    assert ended["end_lat"] == 31.9504
    assert ended["duration_seconds"] is not None and ended["duration_seconds"] >= 0


def test_visit_start_and_end_require_real_coordinates(client, auth_headers):
    doctor_id = client.get("/api/v1/doctors", headers=auth_headers).json()["data"][0]["id"]
    rep_id = client.get("/api/v1/reps", headers=auth_headers).json()[0]["id"]
    created = client.post(
        "/api/v1/visits",
        headers=auth_headers,
        json={"visit_date": date.today().isoformat(), "rep_id": rep_id, "doctor_id": doctor_id},
    )
    assert created.status_code == 201, created.text
    visit_id = created.json()["id"]

    missing_start = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"accuracy": 10},
    )
    assert missing_start.status_code == 422, missing_start.text

    end_before_start = client.post(
        f"/api/v1/visits/{visit_id}/end",
        headers=auth_headers,
        json={"lat": 31.95, "lng": 35.91, "accuracy": 10},
    )
    assert end_before_start.status_code == 400, end_before_start.text
    assert "active visit" in end_before_start.json()["detail"].lower()


def test_start_visit_is_idempotent(client, auth_headers):
    doctors = client.get("/api/v1/doctors", headers=auth_headers).json()["data"]
    doctor_id = doctors[0]["id"] if doctors else None
    if not doctor_id:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. GPS ID", "specialty": "Internal", "area": "Central"},
        )
        doctor_id = doctor_resp.json()["id"]

    rep_id = client.get("/api/v1/reps", headers=auth_headers).json()[0]["id"]

    visit_resp = client.post(
        "/api/v1/visits",
        headers=auth_headers,
        json={
            "visit_date": date.today().isoformat(),
            "rep_id": rep_id,
            "doctor_id": doctor_id,
        },
    )
    visit_id = visit_resp.json()["id"]

    first = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"lat": 31.95, "lng": 35.91, "accuracy": 10.0},
    )
    assert first.status_code == 200, first.text
    first_started = first.json()
    assert first_started["status"] == "in_progress"
    assert first_started["start_lat"] == 31.95

    second = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"lat": 32.0, "lng": 36.0, "accuracy": 5.0},
    )
    assert second.status_code == 200, second.text
    second_started = second.json()
    assert second_started["status"] == "in_progress"
    assert second_started["start_lat"] == 31.95
    assert second_started["started_at"] == first_started["started_at"]


def test_end_visit_is_idempotent(client, auth_headers):
    doctors = client.get("/api/v1/doctors", headers=auth_headers).json()["data"]
    doctor_id = doctors[0]["id"] if doctors else None
    if not doctor_id:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. GPS ID End", "specialty": "Internal", "area": "Central"},
        )
        doctor_id = doctor_resp.json()["id"]

    rep_id = client.get("/api/v1/reps", headers=auth_headers).json()[0]["id"]

    visit_resp = client.post(
        "/api/v1/visits",
        headers=auth_headers,
        json={
            "visit_date": date.today().isoformat(),
            "rep_id": rep_id,
            "doctor_id": doctor_id,
        },
    )
    visit_id = visit_resp.json()["id"]

    start_resp = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"lat": 31.95, "lng": 35.91, "accuracy": 10.0},
    )
    assert start_resp.status_code == 200, start_resp.text

    first_end = client.post(
        f"/api/v1/visits/{visit_id}/end",
        headers=auth_headers,
        json={"lat": 31.9504, "lng": 35.9104, "accuracy": 10.0},
    )
    assert first_end.status_code == 200, first_end.text
    first_data = first_end.json()
    assert first_data["status"] == "completed"

    second_end = client.post(
        f"/api/v1/visits/{visit_id}/end",
        headers=auth_headers,
        json={"lat": 32.0, "lng": 36.0, "accuracy": 10.0},
    )
    assert second_end.status_code == 200, second_end.text
    second_data = second_end.json()
    assert second_data["ended_at"] == first_data["ended_at"]
    assert second_data["status"] == "completed"
    assert second_data["end_lat"] == first_data["end_lat"]


def test_start_visit_retry_skips_gps_revalidation(client, auth_headers, monkeypatch):
    doctors = client.get("/api/v1/doctors", headers=auth_headers).json()["data"]
    doctor_id = doctors[0]["id"] if doctors else None
    if not doctor_id:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. Start Retry", "specialty": "Internal", "area": "Central"},
        )
        doctor_id = doctor_resp.json()["id"]

    rep_id = client.get("/api/v1/reps", headers=auth_headers).json()[0]["id"]
    visit_id = client.post(
        "/api/v1/visits",
        headers=auth_headers,
        json={
            "visit_date": date.today().isoformat(),
            "rep_id": rep_id,
            "doctor_id": doctor_id,
        },
    ).json()["id"]

    first = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"lat": 31.95, "lng": 35.91, "accuracy": 8.0},
    )
    assert first.status_code == 200, first.text
    first_data = first.json()

    monkeypatch.setattr(
        visits_api,
        "validate_accuracy",
        lambda _accuracy: (_ for _ in ()).throw(AssertionError("validate_accuracy should not run on retry")),
    )
    monkeypatch.setattr(
        visits_api,
        "validate_geofence",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(AssertionError("validate_geofence should not run on retry")),
    )

    second = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"lat": 32.0, "lng": 36.0, "accuracy": 9999},
    )
    assert second.status_code == 200, second.text
    second_data = second.json()
    assert second_data["started_at"] == first_data["started_at"]
    assert second_data["start_lat"] == first_data["start_lat"]


def test_end_visit_retry_skips_gps_revalidation(client, auth_headers, monkeypatch):
    doctors = client.get("/api/v1/doctors", headers=auth_headers).json()["data"]
    doctor_id = doctors[0]["id"] if doctors else None
    if not doctor_id:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. End Retry", "specialty": "Internal", "area": "Central"},
        )
        doctor_id = doctor_resp.json()["id"]

    rep_id = client.get("/api/v1/reps", headers=auth_headers).json()[0]["id"]
    visit_id = client.post(
        "/api/v1/visits",
        headers=auth_headers,
        json={
            "visit_date": date.today().isoformat(),
            "rep_id": rep_id,
            "doctor_id": doctor_id,
        },
    ).json()["id"]

    started = client.post(
        f"/api/v1/visits/{visit_id}/start",
        headers=auth_headers,
        json={"lat": 31.95, "lng": 35.91, "accuracy": 8.0},
    )
    assert started.status_code == 200, started.text

    first_end = client.post(
        f"/api/v1/visits/{visit_id}/end",
        headers=auth_headers,
        json={"lat": 31.9502, "lng": 35.9102, "accuracy": 9.0},
    )
    assert first_end.status_code == 200, first_end.text
    first_data = first_end.json()

    monkeypatch.setattr(
        visits_api,
        "validate_accuracy",
        lambda _accuracy: (_ for _ in ()).throw(AssertionError("validate_accuracy should not run on retry")),
    )
    monkeypatch.setattr(
        visits_api,
        "validate_max_distance",
        lambda *_args, **_kwargs: (_ for _ in ()).throw(
            AssertionError("validate_max_distance should not run on retry")
        ),
    )

    second_end = client.post(
        f"/api/v1/visits/{visit_id}/end",
        headers=auth_headers,
        json={"lat": 10.0, "lng": 10.0, "accuracy": 9999},
    )
    assert second_end.status_code == 200, second_end.text
    second_data = second_end.json()
    assert second_data["ended_at"] == first_data["ended_at"]
    assert second_data["end_lat"] == first_data["end_lat"]


def test_update_visit_rejects_lifecycle_fields(client, auth_headers):
    doctors = client.get("/api/v1/doctors", headers=auth_headers).json()["data"]
    doctor_id = doctors[0]["id"] if doctors else None
    if not doctor_id:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. Integrity", "specialty": "Internal", "area": "Central"},
        )
        doctor_id = doctor_resp.json()["id"]

    rep_id = client.get("/api/v1/reps", headers=auth_headers).json()[0]["id"]
    visit_resp = client.post(
        "/api/v1/visits",
        headers=auth_headers,
        json={
            "visit_date": date.today().isoformat(),
            "rep_id": rep_id,
            "doctor_id": doctor_id,
        },
    )
    assert visit_resp.status_code == 201, visit_resp.text
    visit_id = visit_resp.json()["id"]

    mutate_status = client.put(
        f"/api/v1/visits/{visit_id}",
        headers=auth_headers,
        json={"status": "completed"},
    )
    assert mutate_status.status_code == 422, mutate_status.text

    mutate_timestamps = client.put(
        f"/api/v1/visits/{visit_id}",
        headers=auth_headers,
        json={"started_at": date.today().isoformat()},
    )
    assert mutate_timestamps.status_code == 422, mutate_timestamps.text


def test_medical_rep_cannot_create_visit_with_lifecycle_status(client, rep_headers):
    doctors = client.get("/api/v1/doctors", headers=rep_headers).json()["data"]
    doctor_id = doctors[0]["id"] if doctors else None
    if not doctor_id:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=rep_headers,
            json={"name": "Dr. Rep Lifecycle", "specialty": "GP", "area": "Central"},
        )
        assert doctor_resp.status_code in (200, 201), doctor_resp.text
        doctor_id = doctor_resp.json()["id"]

    rep_id = client.get("/api/v1/reps", headers=rep_headers).json()[0]["id"]
    resp = client.post(
        "/api/v1/visits",
        headers=rep_headers,
        json={
            "visit_date": date.today().isoformat(),
            "rep_id": rep_id,
            "doctor_id": doctor_id,
            "status": "completed",
        },
    )
    assert resp.status_code == 400, resp.text
    assert "lifecycle" in resp.json()["detail"].lower()
