from __future__ import annotations

def test_orders_api_unavailable_by_default(client, auth_headers):
    resp = client.get("/api/v1/orders", headers=auth_headers)
    assert resp.status_code == 404, resp.text
