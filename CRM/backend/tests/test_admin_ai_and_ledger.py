from __future__ import annotations

import pytest


def _auth_headers(client):
    token = client.get("/api/dev/token").json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("path", [
    "/api/admin/ai/insights",
    "/api/admin/ai/tasks",
    "/api/admin/ai/drafts",
    "/api/admin/ai/collection-plan",
])
def test_ai_endpoints_smoke(client, path):
    response = client.get(path, headers=_auth_headers(client))
    assert response.status_code in {200, 501, 503}


@pytest.mark.parametrize("legacy_id", ["test_pharmacy", "123"])
def test_ledger_pharmacy_summary_graceful(client, legacy_id):
    response = client.get(
        f"/api/admin/dpm-ledger/pharmacies/{legacy_id}/summary",
        headers=_auth_headers(client),
    )
    assert response.status_code in {200, 204, 404}
