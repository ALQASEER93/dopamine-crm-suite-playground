"""Quick smoke test for FastAPI login."""

from __future__ import annotations

import os
import sys

import httpx


API_BASE_URL = os.getenv("API_BASE_URL", "http://127.0.0.1:8000/api/v1").rstrip("/")
EMAIL = os.getenv("SMOKE_LOGIN_EMAIL", "admin@example.com")
PASSWORD = os.getenv("SMOKE_LOGIN_PASSWORD", "password")
TIMEOUT = float(os.getenv("SMOKE_LOGIN_TIMEOUT", "5"))


def _get_with_token(path: str, token: str) -> httpx.Response:
    url = f"{API_BASE_URL}{path}"
    return httpx.get(url, headers={"Authorization": f"Bearer {token}"}, timeout=TIMEOUT)


def main() -> int:
    login_url = f"{API_BASE_URL}/auth/login"
    try:
        response = httpx.post(
            login_url,
            json={"email": EMAIL, "password": PASSWORD},
            timeout=TIMEOUT,
        )
    except Exception as exc:  # noqa: BLE001
        print(f"[smoke] Request failed: {exc}")
        return 1

    if response.status_code != 200:
        print(f"[smoke] Unexpected status {response.status_code}: {response.text}")
        return 1

    try:
        payload = response.json()
    except Exception:  # noqa: BLE001
        print("[smoke] Response was not JSON.")
        return 1

    token = payload.get("token") or payload.get("access_token") or payload.get("jwt")
    if not token:
        print("[smoke] No token returned in response.")
        return 1

    user = payload.get("user") or payload.get("data") or {}
    user_email = user.get("email") if isinstance(user, dict) else user
    print(f"[smoke] Login OK user={user_email} token={str(token)[:8]}...")

    summary_resp = _get_with_token("/visits/summary", token)
    print(f"[smoke] /visits/summary -> {summary_resp.status_code}")
    if summary_resp.status_code != 200:
        print(summary_resp.text)
        return 1

    latest_resp = _get_with_token("/visits/latest?pageSize=5", token)
    print(f"[smoke] /visits/latest -> {latest_resp.status_code}")
    if latest_resp.status_code != 200:
        print(latest_resp.text)
        return 1

    visits_resp = _get_with_token("/visits?page_size=5", token)
    print(f"[smoke] /visits -> {visits_resp.status_code}")
    if visits_resp.status_code != 200:
        print(visits_resp.text)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
