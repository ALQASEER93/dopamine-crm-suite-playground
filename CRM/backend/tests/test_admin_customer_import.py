from __future__ import annotations

from io import BytesIO
from uuid import uuid4

from fastapi.testclient import TestClient
from openpyxl import Workbook
from sqlalchemy import event

from core.db import SessionLocal
from models.crm import CustomerImportRun, CustomerImportStagingItem, CustomerRouteAssignmentRun, Route, RouteAccount
from services.customer_assignment import AssignmentApplyInput, plan_or_apply_route_assignments
from services.customer_import import import_customers_from_workbook


def _workbook_bytes(prefix: str, *, trusted_confidence: object = "") -> bytes:
    workbook = Workbook()
    worksheet = workbook.active
    worksheet.title = "CRM_Import_Customers"
    worksheet.append(
        [
            "name_clean",
            "customer_type",
            "specialty",
            "classification",
            "area_tag",
            "city",
            "phone",
            "email",
            "formatted_address",
            "monthly_frequency_target",
            "location_status",
            "location_confidence",
            "latitude",
            "longitude",
            "requires_review",
            "review_reason",
            "duplicate_group_count",
            "assigned_rep",
        ]
    )
    worksheet.append(
        [
            f"{prefix} Doctor",
            "doctor/hcp",
            "Cardiology",
            "A",
            "Amman West",
            "Amman",
            "0790000000",
            "",
            "Clinic address",
            2,
            "trusted",
            trusted_confidence,
            31.9539,
            35.9106,
            True,
            "needs admin review",
            2,
            "",
        ]
    )
    worksheet.append(
        [
            f"{prefix} Pharmacy",
            "pharmacy/hco",
            "Retail",
            "",
            "Amman East",
            "Amman",
            "0780000000",
            "",
            "",
            3,
            "needs geocoding",
            "",
            "",
            "",
            True,
            "needs route assignment",
            1,
            "",
        ]
    )
    worksheet.append([f"{prefix} Office", "office"])
    worksheet.append(["", "doctor/hcp"])
    worksheet.append([f"{prefix} Missing Type", ""])

    buffer = BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def _upload(content: bytes) -> dict[str, tuple[str, bytes, str]]:
    return {"file": ("customers.xlsx", content, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}


def _create_import_staging(client: TestClient, auth_headers: dict[str, str], prefix: str) -> list[int]:
    content = _workbook_bytes(prefix)
    response = client.post(
        "/api/v1/admin/customers/import?dryRun=false",
        headers=auth_headers,
        files=_upload(content),
    )
    assert response.status_code == 200, response.text
    run_id = response.json()["audit"]["runId"]
    with SessionLocal() as db:
        return [
            item.id
            for item in db.query(CustomerImportStagingItem)
            .filter(CustomerImportStagingItem.import_run_id == run_id)
            .order_by(CustomerImportStagingItem.id.asc())
            .all()
        ]


def _seed_route() -> tuple[int, str]:
    with SessionLocal() as db:
        route = db.query(Route).filter(Route.name == "QA Route").first()
        assert route is not None
        assert route.rep is not None
        return route.id, route.rep.email


def test_admin_customer_import_dry_run_and_apply(client: TestClient, auth_headers: dict[str, str]) -> None:
    content = _workbook_bytes(f"Import {uuid4().hex[:8]}")

    dry_run = client.post(
        "/api/v1/admin/customers/import?dryRun=true",
        headers=auth_headers,
        files=_upload(content),
    )
    assert dry_run.status_code == 200, dry_run.text
    dry_body = dry_run.json()
    assert dry_body["dryRun"] is True
    assert dry_body["totalRows"] == 5
    assert dry_body["sourceRows"] == 2
    assert dry_body["doctors"] == 1
    assert dry_body["pharmacies"] == 1
    assert dry_body["created"] == 2
    assert dry_body["withTrustedCoordinates"] == 0
    assert dry_body["skipped"] == {
        "missingName": 1,
        "missingCustomerType": 1,
        "unsupportedCustomerType": 1,
    }
    assert dry_body["unsupportedTypes"] == {"office": 1}
    assert dry_body["duplicateReviewNeeded"] == 1
    assert dry_body["routeFrequencyAlignment"]["status"] == "blocked_missing_assignment_source"
    assert dry_body["routeFrequencyAlignment"]["routeAccountsCreated"] == 0
    assert dry_body["audit"]["persisted"] is False

    applied = client.post(
        "/api/v1/admin/customers/import?dryRun=false",
        headers=auth_headers,
        files=_upload(content),
    )
    assert applied.status_code == 200, applied.text
    applied_body = applied.json()
    assert applied_body["dryRun"] is False
    assert applied_body["created"] == 2
    assert applied_body["audit"]["persisted"] is True
    assert applied_body["routeFrequencyAlignment"]["routeAccountsCreated"] == 0

    with SessionLocal() as db:
        audit = db.get(CustomerImportRun, applied_body["audit"]["runId"])
        assert audit is not None
        assert audit.status == "applied"
        assert audit.dry_run is False
        assert audit.actor_user_id is not None
        assert audit.total_parsed_rows == 2
        assert audit.skipped_missing_name_count == 1
        assert audit.skipped_missing_type_count == 1
        assert audit.skipped_unsupported_type_count == 1
        assert audit.route_assignment_pending_count == 2
        staged = (
            db.query(CustomerImportStagingItem)
            .filter(CustomerImportStagingItem.import_run_id == audit.id)
            .all()
        )
        assert len(staged) == 2
        assert {item.assignment_status for item in staged} == {"blocked_missing_assignment_source"}
        assert {item.monthly_frequency_target for item in staged} == {2, 3}

    exported = client.get("/api/v1/admin/customers/export", headers=auth_headers)
    assert exported.status_code == 200, exported.text
    assert "customer_type,id,name" in exported.text
    assert "doctor" in exported.text
    assert "pharmacy" in exported.text


def test_customer_import_export_is_admin_only(
    client: TestClient,
    manager_headers: dict[str, str],
    rep_headers: dict[str, str],
) -> None:
    content = _workbook_bytes(f"Forbidden {uuid4().hex[:8]}")

    for headers in (manager_headers, rep_headers):
        import_resp = client.post(
            "/api/v1/admin/customers/import?dryRun=true",
            headers=headers,
            files=_upload(content),
        )
        assert import_resp.status_code == 403, import_resp.text

        export_resp = client.get("/api/v1/admin/customers/export", headers=headers)
        assert export_resp.status_code == 403, export_resp.text


def test_customer_import_dry_run_does_not_emit_mutation_sql() -> None:
    content = _workbook_bytes(f"No Mutation {uuid4().hex[:8]}")
    mutation_sql: list[str] = []

    with SessionLocal() as db:
        engine = db.get_bind()

        def collect_mutations(_conn, _cursor, statement, _parameters, _context, _executemany):
            normalized = statement.lstrip().upper()
            if normalized.startswith(("INSERT", "UPDATE", "DELETE")):
                mutation_sql.append(statement)

        event.listen(engine, "before_cursor_execute", collect_mutations)
        try:
            result = import_customers_from_workbook(
                db,
                content,
                dry_run=True,
                actor_user_id=1,
                original_filename="customers.xlsx",
            )
        finally:
            event.remove(engine, "before_cursor_execute", collect_mutations)

    assert result["dryRun"] is True
    assert result["audit"]["persisted"] is False
    assert mutation_sql == []


def test_customer_import_coordinates_require_confidence() -> None:
    missing_confidence = _workbook_bytes(f"Missing Confidence {uuid4().hex[:8]}", trusted_confidence="")
    trusted_confidence = _workbook_bytes(f"Trusted Confidence {uuid4().hex[:8]}", trusted_confidence=0.91)

    with SessionLocal() as db:
        missing = import_customers_from_workbook(
            db,
            missing_confidence,
            dry_run=True,
            actor_user_id=1,
            original_filename="customers.xlsx",
        )
        trusted = import_customers_from_workbook(
            db,
            trusted_confidence,
            dry_run=True,
            actor_user_id=1,
            original_filename="customers.xlsx",
        )

    assert missing["withTrustedCoordinates"] == 0
    assert trusted["withTrustedCoordinates"] == 1


def test_customer_import_does_not_create_route_accounts_without_reviewed_assignment(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    content = _workbook_bytes(f"No Route {uuid4().hex[:8]}")

    with SessionLocal() as db:
        before = db.query(RouteAccount).count()

    applied = client.post(
        "/api/v1/admin/customers/import?dryRun=false",
        headers=auth_headers,
        files=_upload(content),
    )
    assert applied.status_code == 200, applied.text
    body = applied.json()
    assert body["routeFrequencyAlignment"]["status"] == "blocked_missing_assignment_source"
    assert body["routeFrequencyAlignment"]["routeAccountsCreated"] == 0

    with SessionLocal() as db:
        after = db.query(RouteAccount).count()

    assert after == before


def test_route_assignment_dry_run_does_not_emit_mutation_sql(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    staging_id = _create_import_staging(client, auth_headers, f"Assign Dry {uuid4().hex[:8]}")[0]
    route_id, rep_email = _seed_route()
    mutation_sql: list[str] = []

    with SessionLocal() as db:
        engine = db.get_bind()

        def collect_mutations(_conn, _cursor, statement, _parameters, _context, _executemany):
            normalized = statement.lstrip().upper()
            if normalized.startswith(("INSERT", "UPDATE", "DELETE")):
                mutation_sql.append(statement)

        event.listen(engine, "before_cursor_execute", collect_mutations)
        try:
            result = plan_or_apply_route_assignments(
                db,
                [
                    AssignmentApplyInput(
                        staging_item_id=staging_id,
                        review_status="approved",
                        assigned_rep_email=rep_email,
                        route_id=route_id,
                        monthly_frequency_target=2,
                    )
                ],
                dry_run=True,
                actor_user_id=1,
            )
        finally:
            event.remove(engine, "before_cursor_execute", collect_mutations)

    assert result["dryRun"] is True
    assert result["created"] == 1
    assert result["routeAccountsCreated"] == 1
    assert result["audit"]["persisted"] is False
    assert mutation_sql == []


def test_route_assignment_apply_creates_and_is_idempotent(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    staging_id = _create_import_staging(client, auth_headers, f"Assign Apply {uuid4().hex[:8]}")[0]
    route_id, rep_email = _seed_route()
    payload = {
        "assignments": [
            {
                "stagingItemId": staging_id,
                "reviewStatus": "approved",
                "assignedRepEmail": rep_email,
                "routeId": route_id,
                "monthlyFrequencyTarget": 2,
            }
        ]
    }

    dry_run = client.post("/api/v1/admin/customers/assignments/apply?dryRun=true", headers=auth_headers, json=payload)
    assert dry_run.status_code == 200, dry_run.text
    assert dry_run.json()["created"] == 1
    assert dry_run.json()["audit"]["persisted"] is False

    applied = client.post("/api/v1/admin/customers/assignments/apply?dryRun=false", headers=auth_headers, json=payload)
    assert applied.status_code == 200, applied.text
    applied_body = applied.json()
    assert applied_body["created"] == 1
    assert applied_body["routeAccountsCreated"] == 1
    assert applied_body["audit"]["persisted"] is True

    again = client.post("/api/v1/admin/customers/assignments/apply?dryRun=false", headers=auth_headers, json=payload)
    assert again.status_code == 200, again.text
    assert again.json()["unchanged"] == 1
    assert again.json()["routeAccountsCreated"] == 0

    with SessionLocal() as db:
        audit = db.get(CustomerRouteAssignmentRun, applied_body["audit"]["runId"])
        staging = db.get(CustomerImportStagingItem, staging_id)
        assert audit is not None
        assert audit.status == "applied"
        assert audit.route_accounts_created_count == 1
        assert staging is not None
        assert staging.assignment_status == "applied"
        assert staging.assigned_rep_user_id is not None
        assert staging.route_account_id is not None
        account = db.get(RouteAccount, staging.route_account_id)
        assert account is not None
        assert account.visit_frequency == "2/month"


def test_route_assignment_blocks_blank_or_ambiguous_rep(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    staging_ids = _create_import_staging(client, auth_headers, f"Assign Block {uuid4().hex[:8]}")
    route_id, _rep_email = _seed_route()
    payload = {
        "assignments": [
            {"stagingItemId": staging_ids[0], "reviewStatus": "approved", "routeId": route_id, "monthlyFrequencyTarget": 2},
            {
                "stagingItemId": staging_ids[1],
                "reviewStatus": "approved",
                "assignedRep": "rep",
                "routeId": route_id,
                "monthlyFrequencyTarget": 3,
            },
        ]
    }

    response = client.post("/api/v1/admin/customers/assignments/apply?dryRun=false", headers=auth_headers, json=payload)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["created"] == 0
    assert body["blocked"] == 2
    assert body["blockedReasons"]["missing_rep"] == 1
    assert body["blockedReasons"]["ambiguous_rep_identifier"] == 1
    assert body["routeAccountsCreated"] == 0


def test_route_assignment_blocks_unapproved_review(
    client: TestClient,
    auth_headers: dict[str, str],
) -> None:
    staging_id = _create_import_staging(client, auth_headers, f"Assign Review {uuid4().hex[:8]}")[0]
    route_id, rep_email = _seed_route()

    response = client.post(
        "/api/v1/admin/customers/assignments/apply?dryRun=true",
        headers=auth_headers,
        json={
            "assignments": [
                {
                    "stagingItemId": staging_id,
                    "reviewStatus": "pending",
                    "assignedRepEmail": rep_email,
                    "routeId": route_id,
                    "monthlyFrequencyTarget": 2,
                }
            ]
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["blockedReasons"]["review_not_approved"] == 1
