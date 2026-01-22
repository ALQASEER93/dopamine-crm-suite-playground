from __future__ import annotations

from datetime import datetime, timedelta, timezone


def test_telemetry_session_and_location(client, auth_headers):
    session_id = "session-test-001"
    started_at = datetime.now(timezone.utc)
    payload = {
        "sessionId": session_id,
        "startedAt": started_at.isoformat(),
        "deviceId": "device-1",
        "appVersion": "0.1.0",
        "platform": "android",
    }

    resp = client.post("/api/v1/telemetry/session/start", json=payload, headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert resp.json()["sessionId"] == session_id

    location_payload = {
        "sessionId": session_id,
        "lat": 31.95,
        "lng": 35.91,
        "accuracy": 10,
        "recordedAt": started_at.isoformat(),
        "deviceId": "device-1",
    }
    loc_resp = client.post("/api/v1/telemetry/location", json=location_payload, headers=auth_headers)
    assert loc_resp.status_code == 200, loc_resp.text
    assert "id" in loc_resp.json()

    stop_payload = {
        "sessionId": session_id,
        "stoppedAt": (started_at + timedelta(minutes=5)).isoformat(),
    }
    stop_resp = client.post("/api/v1/telemetry/session/stop", json=stop_payload, headers=auth_headers)
    assert stop_resp.status_code == 200, stop_resp.text


def test_telemetry_rejects_future_timestamp(client, auth_headers):
    future_time = datetime.now(timezone.utc) + timedelta(hours=2)
    payload = {
        "sessionId": "future-session",
        "lat": 31.9,
        "lng": 35.8,
        "accuracy": 10,
        "recordedAt": future_time.isoformat(),
    }
    resp = client.post("/api/v1/telemetry/location", json=payload, headers=auth_headers)
    assert resp.status_code == 400


def test_telemetry_rejects_low_accuracy(client, auth_headers):
    now = datetime.now(timezone.utc)
    payload = {
        "sessionId": "accuracy-session",
        "lat": 31.9,
        "lng": 35.8,
        "accuracy": 999,
        "recordedAt": now.isoformat(),
    }
    resp = client.post("/api/v1/telemetry/location", json=payload, headers=auth_headers)
    assert resp.status_code == 400
