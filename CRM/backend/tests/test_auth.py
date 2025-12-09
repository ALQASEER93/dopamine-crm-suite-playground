from __future__ import annotations


def test_login_and_me(client):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@dopaminepharma.com", "password": "admin123"},
    )
    assert login_resp.status_code == 200
    body = login_resp.json()
    assert "token" in body
    assert body["user"]["email"] == "admin@dopaminepharma.com"

    headers = {"Authorization": f"Bearer {body['token']}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me = me_resp.json()
    assert me["email"] == "admin@dopaminepharma.com"
    assert me["role"]["slug"] == "admin"
