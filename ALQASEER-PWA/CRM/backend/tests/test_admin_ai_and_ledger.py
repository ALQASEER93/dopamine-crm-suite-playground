from __future__ import annotations

import os
import pytest


def _auth_headers(client):
    os.environ.setdefault("ALLOW_DEV_TOKEN_ENDPOINT", "true")
    token = client.get("/api/dev/token").json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.parametrize("path", [
    "/api/admin/ai/insights",
    "/api/admin/ai/tasks",
    "/api/admin/ai/drafts",
    "/api/admin/ai/collection-plan",
])
def test_ai_endpoints_unavailable_by_default(client, path):
    response = client.get(path, headers=_auth_headers(client))
    assert response.status_code == 404


@pytest.mark.parametrize("legacy_id", ["test_pharmacy", "123"])
def test_ledger_pharmacy_summary_graceful(client, legacy_id):
    response = client.get(
        f"/api/admin/dpm-ledger/pharmacies/{legacy_id}/summary",
        headers=_auth_headers(client),
    )
    assert response.status_code == 404
