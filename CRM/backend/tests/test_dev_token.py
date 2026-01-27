from __future__ import annotations



def test_dev_token_disabled_by_default(client, monkeypatch):
    monkeypatch.delenv("ALLOW_DEV_TOKEN", raising=False)
    monkeypatch.delenv("APP_ENV", raising=False)
    monkeypatch.delenv("DPM_ENV", raising=False)
    monkeypatch.delenv("DEV_TOKEN_PASSWORD", raising=False)

    resp = client.get("/api/dev/token")
    assert resp.status_code == 403


def test_dev_token_blocked_in_production(client, monkeypatch):
    monkeypatch.setenv("ALLOW_DEV_TOKEN", "1")
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.delenv("DPM_ENV", raising=False)
    monkeypatch.delenv("DEV_TOKEN_PASSWORD", raising=False)

    resp = client.get("/api/dev/token")
    assert resp.status_code == 403


def test_dev_token_requires_password(client, monkeypatch):
    monkeypatch.setenv("ALLOW_DEV_TOKEN", "1")
    monkeypatch.setenv("APP_ENV", "development")
    monkeypatch.delenv("DPM_ENV", raising=False)
    monkeypatch.delenv("DEV_TOKEN_PASSWORD", raising=False)

    resp = client.get("/api/dev/token")
    assert resp.status_code == 400
    assert "DEV_TOKEN_PASSWORD" in resp.text
