from __future__ import annotations

from fastapi.testclient import TestClient


def test_admin_users_list(client: TestClient, auth_headers: dict[str, str]) -> None:
    resp = client.get("/api/v1/admin/users", headers=auth_headers)
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)


def test_admin_users_create_and_update(client: TestClient, auth_headers: dict[str, str]) -> None:
    territories = client.get("/api/v1/territories?page=1&pageSize=10", headers=auth_headers).json()
    territory_id = None
    if territories.get("data"):
        territory_id = territories["data"][0]["id"]

    payload = {
        "name": "Test Rep",
        "email": "test.rep@example.com",
        "password": "Rep12345!",
        "userType": "medical_rep",
        "territoryId": territory_id,
    }
    created = client.post("/api/v1/admin/users", json=payload, headers=auth_headers)
    assert created.status_code == 201, created.text
    user_id = created.json()["id"]

    update_payload = {"isActive": False}
    updated = client.patch(f"/api/v1/admin/users/{user_id}", json=update_payload, headers=auth_headers)
    assert updated.status_code == 200, updated.text
    assert updated.json()["isActive"] is False
