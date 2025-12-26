from __future__ import annotations

from fastapi.testclient import TestClient


def test_reports_overview(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/reports/overview", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    data = payload.get("data", payload)
    assert "totalVisits" in data
    assert "successfulVisits" in data
    assert "ordersCount" in data
    assert "ordersTotal" in data


def test_reports_rep_performance(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/reports/rep-performance", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


def test_reports_rep_performance_export(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/reports/rep-performance/export", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert "text/csv" in resp.headers.get("content-type", "")
    assert "rep-performance.csv" in resp.headers.get("content-disposition", "")


def test_reports_product_performance(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/reports/product-performance", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


def test_reports_territory_performance(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/reports/territory-performance", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)
