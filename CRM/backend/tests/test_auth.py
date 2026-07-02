from __future__ import annotations

from core.db import SessionLocal
from models.crm import User


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


def test_login_missing_user_returns_controlled_unauthorized(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "missing.user@example.com", "password": "NoSuchUser123!"},
    )

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password."


def test_login_wrong_password_returns_controlled_unauthorized(client):
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "WrongPassword123!"},
    )

    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid email or password."


def test_login_unsupported_password_hash_returns_controlled_unauthorized(client):
    with SessionLocal() as db:
        user = db.query(User).filter(User.email == "admin@example.com").first()
        assert user is not None
        original_hash = user.password_hash
        user.password_hash = "legacy-unsupported-password-hash"
        db.add(user)
        db.commit()

    try:
        resp = client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "Admin12345!"},
        )

        assert resp.status_code == 401
        assert resp.json()["detail"] == "Invalid email or password."
    finally:
        with SessionLocal() as db:
            user = db.query(User).filter(User.email == "admin@example.com").first()
            assert user is not None
            user.password_hash = original_hash
            db.add(user)
            db.commit()


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


def test_current_user_can_change_password_with_current_password(client):
    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "rep2@example.com", "password": "Rep12345!"},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    change_resp = client.post(
        "/api/v1/auth/me/password",
        headers=headers,
        json={
            "current_password": "Rep12345!",
            "new_password": "Rep12345!Changed",
            "confirm_password": "Rep12345!Changed",
        },
    )
    assert change_resp.status_code == 200
    assert change_resp.json()["message"] == "Password changed."

    old_login = client.post(
        "/api/v1/auth/login",
        json={"email": "rep2@example.com", "password": "Rep12345!"},
    )
    assert old_login.status_code == 401

    new_login = client.post(
        "/api/v1/auth/login",
        json={"email": "rep2@example.com", "password": "Rep12345!Changed"},
    )
    assert new_login.status_code == 200

    client.post(
        "/api/v1/auth/me/password",
        headers={"Authorization": f"Bearer {new_login.json()['token']}"},
        json={
            "current_password": "Rep12345!Changed",
            "new_password": "Rep12345!",
            "confirm_password": "Rep12345!",
        },
    )


def test_current_user_password_change_rejects_wrong_current_password(client, rep_headers):
    resp = client.post(
        "/api/v1/auth/me/password",
        headers=rep_headers,
        json={
            "current_password": "WrongPassword123!",
            "new_password": "Rep12345!Changed",
            "confirm_password": "Rep12345!Changed",
        },
    )

    assert resp.status_code == 400
    assert resp.json()["detail"] == "Current password is incorrect."


def test_current_user_password_change_rejects_mismatched_confirmation(client, rep_headers):
    resp = client.post(
        "/api/v1/auth/me/password",
        headers=rep_headers,
        json={
            "current_password": "Rep12345!",
            "new_password": "Rep12345!Changed",
            "confirm_password": "Rep12345!Different",
        },
    )

    assert resp.status_code == 400
    assert resp.json()["detail"] == "New password confirmation does not match."
