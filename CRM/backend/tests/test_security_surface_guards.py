from __future__ import annotations

import json

from api import _should_mount_dev_router
from api.v1 import auth as auth_module


def _bootstrap_payload() -> dict[str, str]:
    return {
        "email": "bootstrap.admin@example.com",
        "password": "X" * 12,
        "name": "Bootstrap Admin",
        "code": "owner-code",
    }


def test_bootstrap_endpoint_disabled_in_preview(client, monkeypatch):
    monkeypatch.setattr(auth_module.settings, "app_env", "development")
    monkeypatch.setattr(auth_module.settings, "vercel_env", "preview")
    monkeypatch.setattr(auth_module.settings, "bootstrap_code", "owner-code")

    resp = client.post("/api/v1/auth/bootstrap", json=_bootstrap_payload())

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Bootstrap disabled."


def test_bootstrap_endpoint_disabled_in_production(client, monkeypatch):
    monkeypatch.setattr(auth_module.settings, "app_env", "production")
    monkeypatch.setattr(auth_module.settings, "vercel_env", "production")
    monkeypatch.setattr(auth_module.settings, "bootstrap_code", "owner-code")

    resp = client.post("/api/v1/auth/bootstrap", json=_bootstrap_payload())

    assert resp.status_code == 404
    assert resp.json()["detail"] == "Bootstrap disabled."


def test_bootstrap_disabled_error_is_sanitized(client, monkeypatch):
    monkeypatch.setattr(auth_module.settings, "app_env", "production")
    monkeypatch.setattr(auth_module.settings, "vercel_env", "production")
    monkeypatch.setattr(auth_module.settings, "bootstrap_code", "owner-code")

    resp = client.post("/api/v1/auth/bootstrap", json=_bootstrap_payload())
    detail = resp.json()["detail"]

    assert "@" not in detail
    assert "Secret" not in detail
    assert "owner-code" not in detail


def test_dev_token_router_mount_guard_refuses_preview_and_production(monkeypatch):
    monkeypatch.setattr("api.settings.app_env", "development")
    monkeypatch.setattr("api.settings.vercel_env", "preview")
    assert _should_mount_dev_router() is False

    monkeypatch.setattr("api.settings.app_env", "production")
    monkeypatch.setattr("api.settings.vercel_env", "production")
    assert _should_mount_dev_router() is False


def test_dev_token_endpoint_unavailable_outside_development(client, monkeypatch):
    monkeypatch.setattr("api.dev.settings.app_env", "production")

    resp = client.get("/api/dev/token")

    assert resp.status_code == 404


def test_legacy_erp_api_flag_disabled_by_default():
    from api import _legacy_erp_api_enabled
    from core.config import settings

    assert settings.enable_legacy_erp_api is False
    assert _legacy_erp_api_enabled() is False


def test_forbidden_legacy_routes_unavailable_in_default_runtime(client, auth_headers):
    forbidden_paths = [
        "/api/v1/orders",
        "/api/v1/orders/",
        "/api/v1/stock/locations",
        "/api/v1/stock/movements",
        "/api/v1/collections",
        "/api/v1/collections/",
        "/api/admin/dpm-ledger/pharmacies/test/summary",
        "/api/admin/ai/collection-plan",
    ]

    for path in forbidden_paths:
        response = client.get(path, headers=auth_headers)
        assert response.status_code == 404, path


def test_openapi_excludes_forbidden_legacy_paths_and_field_contracts(client):
    schema = client.get("/openapi.json").json()
    paths = schema.get("paths", {})
    forbidden_path_fragments = [
        "/orders",
        "/stock",
        "/collections",
        "/dpm-ledger",
        "/collection-plan",
        "/event-roi",
    ]
    for path in paths:
        assert not any(fragment in path for fragment in forbidden_path_fragments), path

    schema_text = json.dumps(schema, ensure_ascii=False).lower()
    forbidden_contract_terms = [
        "orderscount",
        "orderstotal",
        "totalordervaluejod",
        "avgordervaluejod",
        "payment_status",
        "payment_terms",
        "credit_limit",
        "actual_cost",
        "revenue_impact",
        "roi_value",
        "roi_percent",
        "ledger",
    ]
    for term in forbidden_contract_terms:
        assert term not in schema_text, term


def test_field_product_and_pharmacy_payloads_exclude_financial_fields(client, auth_headers):
    product_response = client.get("/api/v1/products", headers=auth_headers)
    assert product_response.status_code == 200, product_response.text
    for product in product_response.json()["data"]:
        assert "cost" not in product
        assert "selling_price" not in product
        assert "bonus_rules" not in product

    pharmacy_response = client.get("/api/v1/pharmacies", headers=auth_headers)
    assert pharmacy_response.status_code == 200, pharmacy_response.text
    for pharmacy in pharmacy_response.json()["data"]:
        assert "credit_limit" not in pharmacy
        assert "payment_terms" not in pharmacy
