from __future__ import annotations

from fastapi.testclient import TestClient


def test_visits_export_csv(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/visits/export", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert "text/csv" in resp.headers.get("content-type", "")
    assert "visits.csv" in resp.headers.get("content-disposition", "")
