from __future__ import annotations

from core.config import settings
from core.db import SessionLocal
from models.crm import Role, User
from services.auth import hash_password


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


def test_login_accepts_local_domain_email_in_development(client):
    with SessionLocal() as session:
        admin_role = session.query(Role).filter(Role.slug == "admin").first()
        assert admin_role is not None
        email = "admin@dpm.local"
        user = session.query(User).filter(User.email == email).first()
        if not user:
            user = User(
                name="Local Admin",
                email=email,
                role_id=admin_role.id,
                is_active=True,
                password_hash=hash_password("LocalAdmin12345!"),
            )
            session.add(user)
        else:
            user.password_hash = hash_password("LocalAdmin12345!")
            user.is_active = True
            user.role_id = admin_role.id
        session.commit()

    resp = client.post("/api/v1/auth/login", json={"email": "admin@dpm.local", "password": "LocalAdmin12345!"})
    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["user"]["email"] == "admin@dpm.local"


def test_login_rejects_local_domain_email_in_production_mode(client, monkeypatch):
    monkeypatch.setattr(settings, "app_env", "production")
    resp = client.post("/api/v1/auth/login", json={"email": "admin@dpm.local", "password": "any"})
    assert resp.status_code == 422
