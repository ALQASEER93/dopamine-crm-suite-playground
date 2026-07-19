from __future__ import annotations

import json
from pathlib import Path
import re

REPO_ROOT = Path(__file__).resolve().parents[3]
AUTH_ROUTE_FILES = [
    REPO_ROOT / "CRM/backend/api/v1/auth.py",
    REPO_ROOT / "ALQASEER-PWA/CRM/backend/api/v1/auth.py",
]


def _bootstrap_payload() -> dict[str, str]:
    return {
        "email": "bootstrap.admin@example.com",
        "password": "X" * 12,
        "name": "Bootstrap Admin",
        "code": "owner-code",
    }


def test_bootstrap_endpoint_not_exposed_in_preview(client):
    resp = client.post("/api/v1/auth/bootstrap", json=_bootstrap_payload())

    assert resp.status_code == 404


def test_bootstrap_endpoint_not_exposed_in_production(client):
    resp = client.post("/api/v1/auth/bootstrap", json=_bootstrap_payload())

    assert resp.status_code == 404


def test_missing_bootstrap_endpoint_error_is_sanitized(client):
    resp = client.post("/api/v1/auth/bootstrap", json=_bootstrap_payload())
    detail = resp.json()["detail"]

    assert "@" not in detail
    assert "Secret" not in detail
    assert "owner-code" not in detail


def test_no_auth_bootstrap_or_provisioning_route_in_backend_copies():
    forbidden_patterns = {
        "bootstrap path": re.compile(r'["\']/bootstrap["\']'),
        "bootstrap router decorator": re.compile(r"@router\.(get|post|put|patch|delete)\([^)]*bootstrap"),
        "bootstrap handler": re.compile(r"\bdef\s+bootstrap\s*\("),
        "bootstrap schema import": re.compile(r"\bBootstrapRequest\b"),
        "bootstrap service import": re.compile(r"\b(bootstrap_admin|has_admin_user)\b"),
        "provisioning route": re.compile(r"\bprovision(?:ing)?\b", re.IGNORECASE),
        "auth bypass route": re.compile(r"\b(auth[_ -]?bypass|backdoor|hidden[_ -]?admin)\b", re.IGNORECASE),
    }

    for route_file in AUTH_ROUTE_FILES:
        source = route_file.read_text(encoding="utf-8")
        for label, pattern in forbidden_patterns.items():
            assert not pattern.search(source), f"{label} found in {route_file.relative_to(REPO_ROOT)}"


def test_runtime_dev_token_endpoint_does_not_exist(client):
    assert not (REPO_ROOT / "CRM/backend/api/dev.py").exists()
    resp = client.get("/api/dev/token")
    assert resp.status_code == 404
    paths = client.get("/openapi.json").json().get("paths", {})
    assert all("/dev/token" not in path for path in paths)


def test_runtime_auth_service_has_no_hardcoded_default_passwords():
    source = (REPO_ROOT / "CRM/backend/services/auth.py").read_text(encoding="utf-8")
    assert "DEFAULT_USERS" not in source
    assert "Admin12345!" not in source
    assert "Sales12345!" not in source
    assert "Rep12345!" not in source


def test_legacy_erp_router_mount_code_is_absent():
    source = (REPO_ROOT / "CRM/backend/api/__init__.py").read_text(encoding="utf-8")
    assert "dpm_ledger" not in source
    assert "admin_ai" not in source
    assert "enable_legacy_erp_api" not in source


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
