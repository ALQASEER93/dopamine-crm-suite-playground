from __future__ import annotations


def test_visits_summary_endpoint(client, auth_headers):
    response = client.get("/api/v1/visits/summary", headers=auth_headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert "data" in payload
    summary = payload["data"] or {}
    for key in (
        "totalVisits",
        "completedVisits",
        "scheduledVisits",
        "cancelledVisits",
        "inProgressVisits",
        "completionRate",
        "avgDurationMinutes",
        "lastActivityAt",
        "visitsByRep",
    ):
        assert key in summary
    # Regression: ensure static path is not treated as visit_id and does not return validation 422
    assert response.status_code != 422


def test_visits_latest_endpoint_with_page_size(client, auth_headers):
    response = client.get("/api/v1/visits/latest?pageSize=2", headers=auth_headers)
    assert response.status_code == 200, response.text
    payload = response.json()
    assert isinstance(payload.get("data"), list)
    assert len(payload["data"]) <= 2


def test_visits_and_doctors_collection_paths_return_json_without_redirect(client, auth_headers):
    for path in (
        "/api/v1/visits?page=1&page_size=25",
        "/api/v1/visits/?page=1&page_size=25",
        "/api/v1/doctors?page_size=25",
        "/api/v1/doctors/?page_size=25",
    ):
        response = client.get(path, headers=auth_headers, follow_redirects=False)
        assert response.status_code == 200, f"{path}: {response.status_code} {response.text}"
        assert response.headers["content-type"].startswith("application/json")
        assert "data" in response.json()
