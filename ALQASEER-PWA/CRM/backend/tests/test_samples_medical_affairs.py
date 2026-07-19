from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient


def _get_rep_ids(client: TestClient, headers: dict[str, str]) -> tuple[int, int]:
    reps = client.get("/api/v1/reps", headers=headers).json()
    rep1 = next(rep for rep in reps if rep.get("email") == "rep1@example.com")
    rep2 = next(rep for rep in reps if rep.get("email") != "rep1@example.com")
    return rep1["id"], rep2["id"]


def _get_sample_product_id(client: TestClient, headers: dict[str, str]) -> int:
    products_resp = client.get("/api/v1/samples/products", headers=headers)
    assert products_resp.status_code == 200, products_resp.text
    products = products_resp.json()
    if products:
        return products[0]["id"]

    create_resp = client.post(
        "/api/v1/samples/products",
        headers=headers,
        json={
            "code": "SMP-TEST-001",
            "name": "Test Sample Product",
            "unit": "box",
            "therapeutic_area": "General",
            "is_active": True,
        },
    )
    assert create_resp.status_code in (200, 201), create_resp.text
    return create_resp.json()["id"]


def _get_first_doctor_id(client: TestClient, headers: dict[str, str]) -> int:
    doctors_resp = client.get("/api/v1/doctors/?page_size=1", headers=headers)
    assert doctors_resp.status_code == 200, doctors_resp.text
    doctors = doctors_resp.json().get("data") or []
    assert doctors, "expected seeded doctor data"
    return doctors[0]["id"]


def test_samples_distribution_requests_and_rep_scope(
    client: TestClient,
    rep_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    rep1_id, rep2_id = _get_rep_ids(client, manager_headers)
    sample_product_id = _get_sample_product_id(client, manager_headers)

    top_up_resp = client.post(
        "/api/v1/samples/inventory/adjust",
        headers=manager_headers,
        json={
            "sample_product_id": sample_product_id,
            "location_type": "rep",
            "rep_id": rep1_id,
            "delta": 5,
        },
    )
    assert top_up_resp.status_code == 200, top_up_resp.text

    forbidden_scope = client.get(
        f"/api/v1/samples/inventory?rep_id={rep2_id}",
        headers=rep_headers,
    )
    assert forbidden_scope.status_code == 403, forbidden_scope.text

    doctor_id = _get_first_doctor_id(client, rep_headers)
    distribute_resp = client.post(
        "/api/v1/samples/distribute",
        headers=rep_headers,
        json={
            "sample_product_id": sample_product_id,
            "doctor_id": doctor_id,
            "quantity": 1,
            "channel": "in_person",
            "notes": "Field sample drop",
        },
    )
    assert distribute_resp.status_code in (200, 201), distribute_resp.text
    distributed = distribute_resp.json()
    assert distributed["rep_id"] == rep1_id
    assert distributed["quantity"] == 1

    history_resp = client.get("/api/v1/samples/history?page_size=5", headers=rep_headers)
    assert history_resp.status_code == 200, history_resp.text
    history_rows = history_resp.json()["data"]
    assert history_rows
    assert all(row["rep_id"] == rep1_id for row in history_rows)

    request_resp = client.post(
        "/api/v1/samples/request",
        headers=rep_headers,
        json={"sample_product_id": sample_product_id, "quantity_requested": 2, "notes": "Need samples for next week"},
    )
    assert request_resp.status_code in (200, 201), request_resp.text
    request_id = request_resp.json()["id"]

    fulfill_resp = client.patch(
        f"/api/v1/samples/request/{request_id}/status",
        headers=manager_headers,
        json={"status": "fulfilled", "decision_notes": "Approved and fulfilled"},
    )
    assert fulfill_resp.status_code == 200, fulfill_resp.text
    fulfilled_payload = fulfill_resp.json()
    assert fulfilled_payload["status"] == "fulfilled"
    assert fulfilled_payload["fulfillment_distribution_id"] is not None

    rep_requests = client.get("/api/v1/samples/request?page_size=10", headers=rep_headers)
    assert rep_requests.status_code == 200, rep_requests.text
    rep_rows = rep_requests.json()["data"]
    assert any(row["id"] == request_id and row["status"] == "fulfilled" for row in rep_rows)

    history_after_fulfill = client.get("/api/v1/samples/history?page_size=20", headers=rep_headers)
    assert history_after_fulfill.status_code == 200, history_after_fulfill.text
    assert any(
        row["id"] == fulfilled_payload["fulfillment_distribution_id"] and row["channel"] == "request_fulfillment"
        for row in history_after_fulfill.json()["data"]
    )


def test_medical_affairs_endpoints_and_reports(
    client: TestClient,
    rep_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    kol_resp = client.post(
        "/api/v1/medical-affairs/kols",
        headers=manager_headers,
        json={
            "name": "Prof. Samer Al-Khatib",
            "specialty": "Cardiology",
            "institution": "University Hospital",
            "city": "Amman",
            "influence_level": "A",
            "engagement_score": 4.5,
        },
    )
    assert kol_resp.status_code in (200, 201), kol_resp.text
    kol_id = kol_resp.json()["id"]

    starts_at = datetime.now(timezone.utc).replace(microsecond=0)
    ends_at = starts_at + timedelta(hours=3)
    event_resp = client.post(
        "/api/v1/medical-affairs/events",
        headers=manager_headers,
        json={
            "title": "Clinical Evidence Forum",
            "event_type": "conference",
            "status": "planned",
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
            "location": "Amman",
            "organizer": "DPM MA",
        },
    )
    assert event_resp.status_code in (200, 201), event_resp.text
    event_id = event_resp.json()["id"]

    rep_forbidden = client.post(
        "/api/v1/medical-affairs/events",
        headers=rep_headers,
        json={
            "title": "Rep Should Not Create",
            "event_type": "webinar",
            "status": "planned",
            "starts_at": starts_at.isoformat(),
            "ends_at": ends_at.isoformat(),
        },
    )
    assert rep_forbidden.status_code == 403, rep_forbidden.text

    attendee_resp = client.post(
        f"/api/v1/medical-affairs/events/{event_id}/attendees",
        headers=manager_headers,
        json={"kol_id": kol_id, "attendee_role": "speaker", "attended": False},
    )
    assert attendee_resp.status_code in (200, 201), attendee_resp.text
    attendee_id = attendee_resp.json()["id"]

    update_attendee = client.patch(
        f"/api/v1/medical-affairs/events/{event_id}/attendees/{attendee_id}",
        headers=manager_headers,
        json={"attended": True, "feedback_score": 4.8},
    )
    assert update_attendee.status_code == 200, update_attendee.text
    assert update_attendee.json()["attended"] is True

    material_resp = client.post(
        "/api/v1/medical-affairs/materials",
        headers=manager_headers,
        json={
            "title": "Hypertension Guideline 2026",
            "material_type": "pdf",
            "language": "ar",
            "therapeutic_area": "Cardiology",
            "url": "https://example.org/materials/htn-2026",
            "is_active": True,
        },
    )
    assert material_resp.status_code in (200, 201), material_resp.text

    events_list = client.get("/api/v1/medical-affairs/events?page_size=5", headers=rep_headers)
    assert events_list.status_code == 200, events_list.text
    assert any(row["id"] == event_id for row in events_list.json()["data"])

    engagement_report = client.get("/api/v1/medical-affairs/reports/event-engagement", headers=manager_headers)
    assert engagement_report.status_code == 200, engagement_report.text
    assert any(row["event_id"] == event_id for row in engagement_report.json())
    assert all("roi_value" not in row for row in engagement_report.json())

    kol_report = client.get("/api/v1/medical-affairs/reports/kol-engagement", headers=manager_headers)
    assert kol_report.status_code == 200, kol_report.text
    assert any(row["kol_id"] == kol_id for row in kol_report.json())


def test_sample_request_status_transitions_capture_approval_metadata(
    client: TestClient,
    rep_headers: dict[str, str],
    manager_headers: dict[str, str],
) -> None:
    sample_product_id = _get_sample_product_id(client, manager_headers)

    approved_req = client.post(
        "/api/v1/samples/request",
        headers=rep_headers,
        json={"sample_product_id": sample_product_id, "quantity_requested": 1, "notes": "approve this"},
    )
    assert approved_req.status_code in (200, 201), approved_req.text
    approved_id = approved_req.json()["id"]

    approved_resp = client.patch(
        f"/api/v1/samples/request/{approved_id}/status",
        headers=manager_headers,
        json={"status": "approved", "decision_notes": "approved by manager"},
    )
    assert approved_resp.status_code == 200, approved_resp.text
    approved_payload = approved_resp.json()
    assert approved_payload["status"] == "approved"
    assert approved_payload["approver_id"] is not None
    assert approved_payload["decision_notes"] == "approved by manager"
    assert approved_payload["decided_at"] is not None

    rejected_req = client.post(
        "/api/v1/samples/request",
        headers=rep_headers,
        json={"sample_product_id": sample_product_id, "quantity_requested": 1, "notes": "reject this"},
    )
    assert rejected_req.status_code in (200, 201), rejected_req.text
    rejected_id = rejected_req.json()["id"]

    rejected_resp = client.patch(
        f"/api/v1/samples/request/{rejected_id}/status",
        headers=manager_headers,
        json={"status": "rejected", "decision_notes": "insufficient justification"},
    )
    assert rejected_resp.status_code == 200, rejected_resp.text
    rejected_payload = rejected_resp.json()
    assert rejected_payload["status"] == "rejected"
    assert rejected_payload["approver_id"] is not None
    assert rejected_payload["decision_notes"] == "insufficient justification"
    assert rejected_payload["decided_at"] is not None
