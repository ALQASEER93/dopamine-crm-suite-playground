from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any, Dict, Tuple

import httpx

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api/v1").rstrip("/")
EMAIL = os.getenv("SMOKE_LOGIN_EMAIL", "admin@example.com")
PASSWORD = os.getenv("SMOKE_LOGIN_PASSWORD", "Admin12345!")
TIMEOUT = float(os.getenv("SMOKE_LOGIN_TIMEOUT", "5"))
USE_TESTCLIENT = os.getenv("SMOKE_USE_TESTCLIENT", "1") != "0"


def _extract_token_and_user(payload: Dict[str, Any]) -> Tuple[str | None, str | None]:
    token = payload.get("token") or payload.get("access_token") or payload.get("jwt")
    user = payload.get("user") or payload.get("data") or {}
    user_email = user.get("email") if isinstance(user, dict) else user
    return token, user_email


def login_over_http() -> bool:
    login_url = f"{API_BASE_URL}/auth/login"
    try:
        response = httpx.post(
            login_url,
            json={"email": EMAIL, "password": PASSWORD},
            timeout=TIMEOUT,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[smoke] HTTP login failed: {exc}")
        return False

    if response.status_code != 200:
        print(f"[smoke] Unexpected status {response.status_code}: {response.text}")
        return False

    try:
        payload = response.json()
    except Exception:  # noqa: BLE001
        print("[smoke] Response was not JSON.")
        return False

    token, user_email = _extract_token_and_user(payload)
    if not token:
        print("[smoke] No token returned in response.")
        return False

    print(f"[smoke] Login OK (HTTP) user={user_email} token={str(token)[:8]}...")
    return True


def login_with_testclient() -> bool:
    if not USE_TESTCLIENT:
        return False

    try:
        from fastapi.testclient import TestClient
        import main
    except Exception as exc:  # noqa: BLE001
        print(f"[smoke] TestClient unavailable: {exc}")
        return False

    with TestClient(main.app) as client:
        response = client.post("/api/v1/auth/login", json={"email": EMAIL, "password": PASSWORD})

        if response.status_code != 200:
            print(f"[smoke] TestClient login failed ({response.status_code}): {response.text}")
            return False

        payload = response.json()
        token, user_email = _extract_token_and_user(payload)
        if not token:
            print("[smoke] No token returned in TestClient response.")
            return False

        print(f"[smoke] Login OK (in-process) user={user_email} token={str(token)[:8]}...")
        return True


def main() -> int:
    # Try external service first; fall back to in-process TestClient for reliability in CI.
    if login_over_http():
        return 0

    if login_with_testclient():
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
