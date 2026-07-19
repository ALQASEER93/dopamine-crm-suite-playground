from __future__ import annotations

import pytest


@pytest.mark.parametrize("path", [
    "/api/admin/ai/insights",
    "/api/admin/ai/tasks",
    "/api/admin/ai/drafts",
    "/api/admin/ai/collection-plan",
])
def test_ai_endpoints_unavailable_by_default(client, auth_headers, path):
    response = client.get(path, headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.parametrize("legacy_id", ["test_pharmacy", "123"])
def test_ledger_pharmacy_summary_graceful(client, auth_headers, legacy_id):
    response = client.get(
        f"/api/admin/dpm-ledger/pharmacies/{legacy_id}/summary",
        headers=auth_headers,
    )
    assert response.status_code == 404
