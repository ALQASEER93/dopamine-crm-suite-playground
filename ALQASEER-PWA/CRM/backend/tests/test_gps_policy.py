from __future__ import annotations

from datetime import date
import logging

from fastapi.testclient import TestClient

from core.config import settings


def _create_visit(client: TestClient, auth_headers: dict[str, str]) -> int:
    doctors = client.get("/api/v1/doctors", headers=auth_headers).json()["data"]
    if doctors:
        doctor_id = doctors[0]["id"]
    else:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. GPS Policy", "specialty": "GP", "area": "Central"},
        )
        doctor_id = doctor_resp.json()["id"]

    reps_resp = client.get("/api/v1/reps", headers=auth_headers)
    rep_id = reps_resp.json()[0]["id"]

    visit_resp = client.post(
        "/api/v1/visits",
        headers=auth_headers,
        json={
            "visit_date": date.today().isoformat(),
            "rep_id": rep_id,
            "doctor_id": doctor_id,
            "notes": "GPS policy test",
        },
    )
    return visit_resp.json()["id"]


def test_gps_distance_within_limit_passes(client: TestClient, auth_headers: dict[str, str]) -> None:
    original = settings.gps_max_distance_m
    settings.gps_max_distance_m = 200.0
    try:
        visit_id = _create_visit(client, auth_headers)
        start_resp = client.post(
            f"/api/v1/visits/{visit_id}/start",
            headers=auth_headers,
            json={"lat": 31.95, "lng": 35.91, "accuracy": 10.0},
        )
        assert start_resp.status_code == 200, start_resp.text

        end_resp = client.post(
            f"/api/v1/visits/{visit_id}/end",
            headers=auth_headers,
            json={"lat": 31.9505, "lng": 35.9105, "accuracy": 10.0},
        )
        assert end_resp.status_code == 200, end_resp.text
    finally:
        settings.gps_max_distance_m = original


def test_gps_distance_outside_limit_fails(client: TestClient, auth_headers: dict[str, str]) -> None:
    original = settings.gps_max_distance_m
    settings.gps_max_distance_m = 10.0
    try:
        visit_id = _create_visit(client, auth_headers)
        client.post(
            f"/api/v1/visits/{visit_id}/start",
            headers=auth_headers,
            json={"lat": 31.95, "lng": 35.91, "accuracy": 10.0},
        )

        end_resp = client.post(
            f"/api/v1/visits/{visit_id}/end",
            headers=auth_headers,
            json={"lat": 31.951, "lng": 35.912, "accuracy": 10.0},
        )
        assert end_resp.status_code == 400, end_resp.text
    finally:
        settings.gps_max_distance_m = original


def test_low_accuracy_fails(client: TestClient, auth_headers: dict[str, str]) -> None:
    original = settings.gps_min_accuracy_m
    settings.gps_min_accuracy_m = 5.0
    try:
        visit_id = _create_visit(client, auth_headers)
        start_resp = client.post(
            f"/api/v1/visits/{visit_id}/start",
            headers=auth_headers,
            json={"lat": 31.95, "lng": 35.91, "accuracy": 20.0},
        )
        assert start_resp.status_code == 400, start_resp.text
    finally:
        settings.gps_min_accuracy_m = original


def test_geofence_within_radius_passes(client: TestClient, auth_headers: dict[str, str]) -> None:
    original_enabled = settings.geofence_enabled
    original_radius = settings.geofence_radius_m
    settings.geofence_enabled = True
    settings.geofence_radius_m = 120.0
    try:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. GeoFence OK", "specialty": "GP", "area": "Central", "latitude": 31.95, "longitude": 35.91},
        )
        assert doctor_resp.status_code in (200, 201), doctor_resp.text
        doctor_id = doctor_resp.json()["id"]

        reps_resp = client.get("/api/v1/reps", headers=auth_headers)
        rep_id = reps_resp.json()[0]["id"]
        visit_resp = client.post(
            "/api/v1/visits",
            headers=auth_headers,
            json={"visit_date": date.today().isoformat(), "rep_id": rep_id, "doctor_id": doctor_id},
        )
        visit_id = visit_resp.json()["id"]

        start_resp = client.post(
            f"/api/v1/visits/{visit_id}/start",
            headers=auth_headers,
            json={"lat": 31.95, "lng": 35.91, "accuracy": 10.0},
        )
        assert start_resp.status_code == 200, start_resp.text
    finally:
        settings.geofence_enabled = original_enabled
        settings.geofence_radius_m = original_radius


def test_geofence_outside_radius_fails(client: TestClient, auth_headers: dict[str, str]) -> None:
    original_enabled = settings.geofence_enabled
    original_radius = settings.geofence_radius_m
    settings.geofence_enabled = True
    settings.geofence_radius_m = 50.0
    try:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. GeoFence Fail", "specialty": "GP", "area": "Central", "latitude": 31.95, "longitude": 35.91},
        )
        assert doctor_resp.status_code in (200, 201), doctor_resp.text
        doctor_id = doctor_resp.json()["id"]

        reps_resp = client.get("/api/v1/reps", headers=auth_headers)
        rep_id = reps_resp.json()[0]["id"]
        visit_resp = client.post(
            "/api/v1/visits",
            headers=auth_headers,
            json={"visit_date": date.today().isoformat(), "rep_id": rep_id, "doctor_id": doctor_id},
        )
        visit_id = visit_resp.json()["id"]

        start_resp = client.post(
            f"/api/v1/visits/{visit_id}/start",
            headers=auth_headers,
            json={"lat": 31.96, "lng": 35.91, "accuracy": 10.0},
        )
        assert start_resp.status_code == 400, start_resp.text
    finally:
        settings.geofence_enabled = original_enabled
        settings.geofence_radius_m = original_radius


def test_geofence_override_allows_start(client: TestClient, auth_headers: dict[str, str]) -> None:
    original_enabled = settings.geofence_enabled
    original_radius = settings.geofence_radius_m
    original_allow_override = settings.allow_gps_override
    settings.geofence_enabled = True
    settings.geofence_radius_m = 10.0
    settings.allow_gps_override = True
    try:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. GeoFence Override", "specialty": "GP", "area": "Central", "latitude": 31.95, "longitude": 35.91},
        )
        assert doctor_resp.status_code in (200, 201), doctor_resp.text
        doctor_id = doctor_resp.json()["id"]

        reps_resp = client.get("/api/v1/reps", headers=auth_headers)
        rep_id = reps_resp.json()[0]["id"]
        visit_resp = client.post(
            "/api/v1/visits",
            headers=auth_headers,
            json={"visit_date": date.today().isoformat(), "rep_id": rep_id, "doctor_id": doctor_id},
        )
        visit_id = visit_resp.json()["id"]

        start_resp = client.post(
            f"/api/v1/visits/{visit_id}/start?gpsOverride=true",
            headers=auth_headers,
            json={"lat": 31.96, "lng": 35.91, "accuracy": 10.0},
        )
        assert start_resp.status_code == 200, start_resp.text
    finally:
        settings.geofence_enabled = original_enabled
        settings.geofence_radius_m = original_radius
        settings.allow_gps_override = original_allow_override


def test_geofence_override_disabled_by_setting(client: TestClient, auth_headers: dict[str, str]) -> None:
    original_enabled = settings.geofence_enabled
    original_radius = settings.geofence_radius_m
    original_allow_override = settings.allow_gps_override
    settings.geofence_enabled = True
    settings.geofence_radius_m = 10.0
    settings.allow_gps_override = False
    try:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. Override Disabled", "specialty": "GP", "area": "Central", "latitude": 31.95, "longitude": 35.91},
        )
        assert doctor_resp.status_code in (200, 201), doctor_resp.text
        doctor_id = doctor_resp.json()["id"]

        reps_resp = client.get("/api/v1/reps", headers=auth_headers)
        rep_id = reps_resp.json()[0]["id"]
        visit_resp = client.post(
            "/api/v1/visits",
            headers=auth_headers,
            json={"visit_date": date.today().isoformat(), "rep_id": rep_id, "doctor_id": doctor_id},
        )
        visit_id = visit_resp.json()["id"]

        start_resp = client.post(
            f"/api/v1/visits/{visit_id}/start?gpsOverride=true",
            headers=auth_headers,
            json={"lat": 31.96, "lng": 35.91, "accuracy": 10.0},
        )
        assert start_resp.status_code == 400, start_resp.text
    finally:
        settings.geofence_enabled = original_enabled
        settings.geofence_radius_m = original_radius
        settings.allow_gps_override = original_allow_override


def test_geofence_missing_target_coords_fails_when_required(client: TestClient, auth_headers: dict[str, str]) -> None:
    original_enabled = settings.geofence_enabled
    original_radius = settings.geofence_radius_m
    original_require_target = settings.geofence_require_target_coords
    settings.geofence_enabled = True
    settings.geofence_radius_m = 120.0
    settings.geofence_require_target_coords = True
    try:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. No Target Coords", "specialty": "GP", "area": "Central"},
        )
        assert doctor_resp.status_code in (200, 201), doctor_resp.text
        doctor_id = doctor_resp.json()["id"]

        reps_resp = client.get("/api/v1/reps", headers=auth_headers)
        rep_id = reps_resp.json()[0]["id"]
        visit_resp = client.post(
            "/api/v1/visits",
            headers=auth_headers,
            json={"visit_date": date.today().isoformat(), "rep_id": rep_id, "doctor_id": doctor_id},
        )
        visit_id = visit_resp.json()["id"]

        start_resp = client.post(
            f"/api/v1/visits/{visit_id}/start",
            headers=auth_headers,
            json={"lat": 31.95, "lng": 35.91, "accuracy": 10.0},
        )
        assert start_resp.status_code == 400, start_resp.text
        assert "Target location coordinates are missing" in start_resp.text
    finally:
        settings.geofence_enabled = original_enabled
        settings.geofence_radius_m = original_radius
        settings.geofence_require_target_coords = original_require_target


def test_geofence_override_logs_audit_context(client: TestClient, auth_headers: dict[str, str], caplog) -> None:
    original_enabled = settings.geofence_enabled
    original_radius = settings.geofence_radius_m
    original_allow_override = settings.allow_gps_override
    settings.geofence_enabled = True
    settings.geofence_radius_m = 10.0
    settings.allow_gps_override = True
    try:
        doctor_resp = client.post(
            "/api/v1/doctors",
            headers=auth_headers,
            json={"name": "Dr. Override Audit", "specialty": "GP", "area": "Central", "latitude": 31.95, "longitude": 35.91},
        )
        assert doctor_resp.status_code in (200, 201), doctor_resp.text
        doctor_id = doctor_resp.json()["id"]

        reps_resp = client.get("/api/v1/reps", headers=auth_headers)
        rep_id = reps_resp.json()[0]["id"]
        visit_resp = client.post(
            "/api/v1/visits",
            headers=auth_headers,
            json={"visit_date": date.today().isoformat(), "rep_id": rep_id, "doctor_id": doctor_id},
        )
        visit_id = visit_resp.json()["id"]

        with caplog.at_level(logging.WARNING):
            start_resp = client.post(
                f"/api/v1/visits/{visit_id}/start?gpsOverride=true&gpsOverrideReason=field+exception",
                headers=auth_headers,
                json={"lat": 31.96, "lng": 35.91, "accuracy": 12.5},
            )
        assert start_resp.status_code == 200, start_resp.text
        assert "GPS override used for visit start" in caplog.text
        assert "visit_id=" in caplog.text
        assert "user_id=" in caplog.text
        assert "lat=31.96" in caplog.text
        assert "lng=35.91" in caplog.text
        assert "accuracy=12.5" in caplog.text
        assert "reason=field exception" in caplog.text
    finally:
        settings.geofence_enabled = original_enabled
        settings.geofence_radius_m = original_radius
        settings.allow_gps_override = original_allow_override
