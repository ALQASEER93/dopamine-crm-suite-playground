from __future__ import annotations

import os


def test_seed_local_users_disabled_by_default(client):
    response = client.post("/api/dev/seed-local-users")
    assert response.status_code == 404


def test_seed_local_users_is_idempotent_and_login_works(client, monkeypatch):
    monkeypatch.setenv("ALLOW_DEV_LOCAL_SEED_ENDPOINT", "true")

    first = client.post("/api/dev/seed-local-users")
    assert first.status_code == 200, first.text
    first_payload = first.json()
    assert first_payload["seeded"] is True
    assert first_payload["count"] == 5
    first_emails = [entry["email"] for entry in first_payload["users"]]
    assert len(set(first_emails)) == 5

    second = client.post("/api/dev/seed-local-users")
    assert second.status_code == 200, second.text
    second_payload = second.json()
    assert second_payload["count"] == 5
    second_emails = [entry["email"] for entry in second_payload["users"]]
    assert sorted(first_emails) == sorted(second_emails)

    by_email = {entry["email"]: entry for entry in second_payload["users"]}
    admin_login = client.post(
        "/api/v1/auth/login",
        json={"email": "admin@dpm.local", "password": by_email["admin@dpm.local"]["password"]},
    )
    assert admin_login.status_code == 200, admin_login.text

    rep_login = client.post(
        "/api/v1/auth/login",
        json={"email": "rep1@dpm.local", "password": by_email["rep1@dpm.local"]["password"]},
    )
    assert rep_login.status_code == 200, rep_login.text
    rep_token = rep_login.json()["token"]
    rep_headers = {"Authorization": f"Bearer {rep_token}"}
    forbidden = client.get("/api/v1/admin/users", headers=rep_headers)
    assert forbidden.status_code == 403

    # Keep test environment clean for subsequent tests in-process.
    os.environ.pop("ALLOW_DEV_LOCAL_SEED_ENDPOINT", None)
