"""Smoke test for dashboard visits endpoints."""

from __future__ import annotations

import os
import sys

import httpx

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api/v1").rstrip("/")
EMAIL = os.getenv("SMOKE_LOGIN_EMAIL", "admin@example.com")
PASSWORD = os.getenv("SMOKE_LOGIN_PASSWORD", "password")
TIMEOUT = float(os.getenv("SMOKE_LOGIN_TIMEOUT", "5"))


def login() -> str | None:
    url = f"{API_BASE_URL}/auth/login"
    try:
        response = httpx.post(url, json={"email": EMAIL, "password": PASSWORD}, timeout=TIMEOUT)
    except Exception as exc:  # noqa: BLE001
        print(f"[smoke] Login request failed: {exc}")
        return None

    if response.status_code != 200:
        print(f"[smoke] Login failed ({response.status_code}): {response.text}")
        return None

    try:
        payload = response.json()
    except Exception:  # noqa: BLE001
        print("[smoke] Login response was not JSON.")
        return None

    token = payload.get("token") or payload.get("access_token") or payload.get("jwt")
    if not token:
        print("[smoke] No token in login response.")
        return None

    user = payload.get("user") or payload.get("data") or {}
    user_email = user.get("email") if isinstance(user, dict) else user
    print(f"[smoke] Login OK user={user_email} token={str(token)[:8]}...")
    return token


def call_endpoint(path: str, token: str, params: dict | None = None) -> bool:
    url = f"{API_BASE_URL}{path if path.startswith('/') else f'/{path}'}"
    try:
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            params=params or None,
            timeout=TIMEOUT,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[smoke] GET {url} failed: {exc}")
        return False

    try:
        body = response.json()
    except Exception:  # noqa: BLE001
        body = response.text

    if response.status_code != 200:
        print(f"[smoke] GET {url} -> {response.status_code}")
        print(body)
        return False

    print(f"[smoke] GET {url} -> 200 OK")
    return True


def main() -> int:
    token = login()
    if not token:
        return 1

    ok_summary = call_endpoint("/visits/summary", token)
    ok_latest = call_endpoint("/visits/latest", token, params={"pageSize": 5})

    return 0 if ok_summary and ok_latest else 1


if __name__ == "__main__":
    sys.exit(main())
