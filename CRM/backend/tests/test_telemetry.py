from __future__ import annotations

from datetime import datetime, timezone


def test_telemetry_location_roundtrip(client, auth_headers):
    payload = {
        "lat": 30.0444,
        "lng": 31.2357,
        "accuracy": 12.5,
        "speed": 1.8,
        "bearing": 42.0,
        "ts": datetime.now(timezone.utc).isoformat(),
        "device_info": '{"platform":"android"}',
        "source": "native_capacitor",
    }
    resp = client.post("/api/v1/telemetry/location", json=payload, headers=auth_headers)
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["lat"] == payload["lat"]
    assert body["lng"] == payload["lng"]
    rep_id = body["rep_id"]

    latest_resp = client.get(
        f"/api/v1/telemetry/location/latest?rep_id={rep_id}",
        headers=auth_headers,
    )
    assert latest_resp.status_code == 200, latest_resp.text
    latest = latest_resp.json()
    assert latest and latest[0]["rep_id"] == rep_id

    trail_resp = client.get(
        f"/api/v1/telemetry/location/trail?rep_id={rep_id}&limit=5",
        headers=auth_headers,
    )
    assert trail_resp.status_code == 200, trail_resp.text
    trail = trail_resp.json()
    assert trail and trail[0]["rep_id"] == rep_id
