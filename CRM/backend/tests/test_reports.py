from __future__ import annotations

from fastapi.testclient import TestClient
import pytest


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


@pytest.mark.parametrize(
    "endpoint",
    [
        "/api/v1/reports/overview",
        "/api/v1/reports/rep-performance",
        "/api/v1/reports/product-performance",
        "/api/v1/reports/territory-performance",
        "/api/v1/reports/rep-performance/export",
    ],
)
def test_reports_rbac(
    client: TestClient,
    auth_headers: dict[str, str],
    manager_headers: dict[str, str],
    rep_headers: dict[str, str],
    endpoint: str,
) -> None:
    admin_resp = client.get(endpoint, headers=auth_headers)
    assert admin_resp.status_code == 200, admin_resp.text

    manager_resp = client.get(endpoint, headers=manager_headers)
    assert manager_resp.status_code == 200, manager_resp.text

    rep_resp = client.get(endpoint, headers=rep_headers)
    assert rep_resp.status_code == 403, rep_resp.text
