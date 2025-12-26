from __future__ import annotations

from datetime import date

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
