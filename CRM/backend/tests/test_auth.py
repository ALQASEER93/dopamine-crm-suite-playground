from __future__ import annotations


def test_login_and_me(client):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "Admin12345!"},
    )
    assert login_resp.status_code == 200
    body = login_resp.json()
    assert "token" in body
    assert body["user"]["email"] == "admin@example.com"

    headers = {"Authorization": f"Bearer {body['token']}"}
    me_resp = client.get("/api/v1/auth/me", headers=headers)
    assert me_resp.status_code == 200
    me = me_resp.json()
    assert me["email"] == "admin@example.com"
    assert me["role"]["slug"] == "admin"


def test_login_default_seeded_users(client):
    users = [
        ("admin@example.com", "Admin12345!", "admin"),
        ("sales_manager@example.com", "Sales12345!", "sales_manager"),
        ("rep1@example.com", "Rep12345!", "medical_rep"),
        ("rep2@example.com", "Rep12345!", "medical_rep"),
        ("rep3@example.com", "Rep12345!", "medical_rep"),
    ]

    for email, password, role_slug in users:
        resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert "token" in body
        assert body["user"]["email"] == email
        assert body["user"]["role"]["slug"] == role_slug
