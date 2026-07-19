from __future__ import annotations

from config.settings import Settings


def test_allowed_origins_accepts_comma_separated_env(monkeypatch):
    monkeypatch.setenv("ALLOWED_ORIGINS", "https://a.example.com, https://b.example.com")
    settings = Settings()
    assert settings.allowed_origins == ["https://a.example.com", "https://b.example.com"]
