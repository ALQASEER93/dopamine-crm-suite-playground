from __future__ import annotations


def test_root_returns_welcome_message(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "Welcome" in data.get("message", "")
    assert "ALQASEER CRM API" in data.get("message", "")


def test_status_ok(client):
    response = client.get("/status")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_api_v1_health(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data.get("status") == "ok"
    assert "db" in data
    assert "version" in data
    assert "vercel_env" in data
    assert "default_admin_reset_raw" in data
    assert "default_admin_reset_bool" in data
    assert "default_admin_email_set" in data
    assert "default_admin_password_set" in data
