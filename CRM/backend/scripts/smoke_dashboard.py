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
PASSWORD = os.getenv("SMOKE_LOGIN_PASSWORD", "password")
TIMEOUT = float(os.getenv("SMOKE_LOGIN_TIMEOUT", "5"))
USE_TESTCLIENT = os.getenv("SMOKE_USE_TESTCLIENT", "1") != "0"


def _extract_token_and_user(payload: Dict[str, Any]) -> Tuple[str | None, str | None]:
    token = payload.get("token") or payload.get("access_token") or payload.get("jwt")
    user = payload.get("user") or payload.get("data") or {}
    user_email = user.get("email") if isinstance(user, dict) else user
    return token, user_email


def login_over_http() -> str | None:
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

    token, user_email = _extract_token_and_user(payload)
    if not token:
        print("[smoke] No token in login response.")
        return None

    print(f"[smoke] Login OK (HTTP) user={user_email} token={str(token)[:8]}...")
    return token


def call_endpoint_http(path: str, token: str, params: dict | None = None) -> bool:
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


def run_http_flow() -> bool:
    token = login_over_http()
    if not token:
        return False

    ok_summary = call_endpoint_http("/visits/summary", token)
    ok_latest = call_endpoint_http("/visits/latest", token, params={"pageSize": 5})

    return ok_summary and ok_latest


def run_testclient_flow() -> bool:
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
            print("[smoke] No token in TestClient login response.")
            return False

        print(f"[smoke] Login OK (in-process) user={user_email} token={str(token)[:8]}...")

        ok_summary = client.get("/api/v1/visits/summary", headers={"Authorization": f"Bearer {token}"})
        ok_latest = client.get(
            "/api/v1/visits/latest",
            headers={"Authorization": f"Bearer {token}"},
            params={"pageSize": 5},
        )

        if ok_summary.status_code != 200:
            print(f"[smoke] /visits/summary failed: {ok_summary.status_code} {ok_summary.text}")
            return False
        if ok_latest.status_code != 200:
            print(f"[smoke] /visits/latest failed: {ok_latest.status_code} {ok_latest.text}")
            return False

        print("[smoke] Dashboard summary and latest visits OK (in-process)")
        return True


def main() -> int:
    if run_http_flow():
        return 0

    if run_testclient_flow():
        return 0

    return 1


if __name__ == "__main__":
    sys.exit(main())
