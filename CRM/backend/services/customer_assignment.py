from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.crm import (
    CustomerImportStagingItem,
    CustomerRouteAssignmentRun,
    Role,
    Route,
    RouteAccount,
    User,
)


APPROVED_REVIEW_STATUS = "approved"


@dataclass(frozen=True)
class AssignmentApplyInput:
    staging_item_id: int
    review_status: str
    assigned_rep_email: str | None = None
    assigned_rep_id: int | None = None
    assigned_rep: str | None = None
    route_id: int | None = None
    monthly_frequency_target: int | None = None


@dataclass(frozen=True)
class AssignmentPlanItem:
    request: AssignmentApplyInput
    action: str
    reason: str | None
    staging_item_id: int
    route_id: int | None = None
    rep_id: int | None = None
    route_account_id: int | None = None
    visit_frequency: str | None = None


@dataclass(frozen=True)
class AssignmentPlan:
    items: list[AssignmentPlanItem]
    summary: dict[str, Any]


def monthly_target_to_frequency(value: int | None) -> str | None:
    if value is None:
        return None
    if value < 1:
        return None
    return f"{value}/month"


def monthly_target_from_frequency(value: str | None) -> int | None:
    normalized = (value or "").strip().lower().replace("_", "-")
    if not normalized:
        return None
    if normalized in {"weekly", "1/week", "every-week"}:
        return 4
    if normalized in {"bi-weekly", "biweekly", "every-2-weeks", "fortnightly"}:
        return 2
    if normalized in {"monthly", "1/month"}:
        return 1
    if normalized == "quarterly":
        return 0
    if normalized.endswith("/month"):
        raw_number = normalized.removesuffix("/month").strip()
        if raw_number.isdigit():
            parsed = int(raw_number)
            return parsed if parsed > 0 else None
    return None


def _empty_summary(*, dry_run: bool, total_rows: int) -> dict[str, Any]:
    return {
        "dryRun": dry_run,
        "totalRows": total_rows,
        "created": 0,
        "updated": 0,
        "unchanged": 0,
        "skipped": 0,
        "blocked": 0,
        "routeAccountsCreated": 0,
        "routeAccountsUpdated": 0,
        "blockedReasons": {},
        "audit": {
            "persisted": False,
            "runId": None,
            "status": "planned" if dry_run else "pending_apply",
        },
    }


def _add_blocked_reason(summary: dict[str, Any], reason: str) -> None:
    summary["blocked"] += 1
    summary["blockedReasons"][reason] = summary["blockedReasons"].get(reason, 0) + 1


def _is_email(value: str) -> bool:
    return "@" in value and "." in value.split("@", 1)[-1]


def _resolve_rep(db: Session, request: AssignmentApplyInput) -> tuple[User | None, str | None]:
    rep_from_id: User | None = None
    rep_from_email: User | None = None

    if request.assigned_rep_id is not None:
        rep_from_id = (
            db.query(User)
            .join(Role)
            .filter(User.id == request.assigned_rep_id, User.is_active.is_(True), Role.slug == "medical_rep")
            .first()
        )
        if rep_from_id is None:
            return None, "invalid_rep_id"

    email = request.assigned_rep_email
    if not email and request.assigned_rep:
        raw = request.assigned_rep.strip()
        if raw.isdigit():
            request = AssignmentApplyInput(
                staging_item_id=request.staging_item_id,
                review_status=request.review_status,
                assigned_rep_id=int(raw),
                route_id=request.route_id,
                monthly_frequency_target=request.monthly_frequency_target,
            )
            return _resolve_rep(db, request)
        if _is_email(raw):
            email = raw
        else:
            return None, "ambiguous_rep_identifier"

    if email:
        rep_from_email = (
            db.query(User)
            .join(Role)
            .filter(func.lower(User.email) == email.lower(), User.is_active.is_(True), Role.slug == "medical_rep")
            .first()
        )
        if rep_from_email is None:
            return None, "invalid_rep_email"

    if rep_from_id and rep_from_email and rep_from_id.id != rep_from_email.id:
        return None, "rep_identifier_conflict"

    rep = rep_from_id or rep_from_email
    if rep is None:
        return None, "missing_rep"
    return rep, None


def _resolve_route(db: Session, *, rep: User, route_id: int | None) -> tuple[Route | None, str | None]:
    if route_id is not None:
        route = db.get(Route, route_id)
        if route is None:
            return None, "invalid_route"
        if route.rep_id != rep.id:
            return None, "route_rep_mismatch"
        return route, None

    routes = db.query(Route).filter(Route.rep_id == rep.id).order_by(Route.id.asc()).all()
    if not routes:
        return None, "missing_route"
    if len(routes) > 1:
        return None, "ambiguous_route"
    return routes[0], None


def _route_account_filter(db: Session, *, route_id: int, staging: CustomerImportStagingItem):
    query = db.query(RouteAccount).filter(
        RouteAccount.route_id == route_id,
        RouteAccount.account_type == staging.customer_type,
    )
    if staging.customer_type == "doctor":
        return query.filter(RouteAccount.doctor_id == staging.doctor_id)
    return query.filter(RouteAccount.pharmacy_id == staging.pharmacy_id)


def _existing_customer_assignment(db: Session, staging: CustomerImportStagingItem) -> list[RouteAccount]:
    query = db.query(RouteAccount).filter(RouteAccount.account_type == staging.customer_type)
    if staging.customer_type == "doctor":
        query = query.filter(RouteAccount.doctor_id == staging.doctor_id)
    else:
        query = query.filter(RouteAccount.pharmacy_id == staging.pharmacy_id)
    return query.order_by(RouteAccount.id.asc()).all()


def build_route_assignment_plan(
    db: Session,
    assignments: list[AssignmentApplyInput],
    *,
    dry_run: bool,
) -> AssignmentPlan:
    summary = _empty_summary(dry_run=dry_run, total_rows=len(assignments))
    items: list[AssignmentPlanItem] = []

    with db.no_autoflush:
        for request in assignments:
            if request.review_status != APPROVED_REVIEW_STATUS:
                reason = "review_not_approved"
                _add_blocked_reason(summary, reason)
                items.append(AssignmentPlanItem(request, "blocked", reason, request.staging_item_id))
                continue

            staging = db.get(CustomerImportStagingItem, request.staging_item_id)
            if staging is None:
                reason = "missing_staging_item"
                _add_blocked_reason(summary, reason)
                items.append(AssignmentPlanItem(request, "blocked", reason, request.staging_item_id))
                continue

            if not ((staging.customer_type == "doctor" and staging.doctor_id) or (staging.customer_type == "pharmacy" and staging.pharmacy_id)):
                reason = "missing_customer_link"
                _add_blocked_reason(summary, reason)
                items.append(AssignmentPlanItem(request, "blocked", reason, request.staging_item_id))
                continue

            rep, rep_error = _resolve_rep(db, request)
            if rep_error or rep is None:
                reason = rep_error or "missing_rep"
                _add_blocked_reason(summary, reason)
                items.append(AssignmentPlanItem(request, "blocked", reason, request.staging_item_id))
                continue

            route, route_error = _resolve_route(db, rep=rep, route_id=request.route_id)
            if route_error or route is None:
                reason = route_error or "missing_route"
                _add_blocked_reason(summary, reason)
                items.append(AssignmentPlanItem(request, "blocked", reason, request.staging_item_id, rep_id=rep.id))
                continue

            target = request.monthly_frequency_target if request.monthly_frequency_target is not None else staging.monthly_frequency_target
            visit_frequency = monthly_target_to_frequency(target)
            if visit_frequency is None:
                reason = "missing_monthly_frequency_target"
                _add_blocked_reason(summary, reason)
                items.append(AssignmentPlanItem(request, "blocked", reason, request.staging_item_id, route_id=route.id, rep_id=rep.id))
                continue

            existing_for_customer = _existing_customer_assignment(db, staging)
            if any(account.route_id != route.id for account in existing_for_customer):
                reason = "customer_already_assigned_to_other_route"
                _add_blocked_reason(summary, reason)
                items.append(AssignmentPlanItem(request, "blocked", reason, request.staging_item_id, route_id=route.id, rep_id=rep.id))
                continue

            matching = _route_account_filter(db, route_id=route.id, staging=staging).order_by(RouteAccount.id.asc()).all()
            if len(matching) > 1:
                reason = "ambiguous_route_account"
                _add_blocked_reason(summary, reason)
                items.append(AssignmentPlanItem(request, "blocked", reason, request.staging_item_id, route_id=route.id, rep_id=rep.id))
                continue

            existing = matching[0] if matching else None
            if existing is None:
                action = "created"
                summary["created"] += 1
                summary["routeAccountsCreated"] += 1
                route_account_id = None
            elif existing.visit_frequency != visit_frequency:
                action = "updated"
                summary["updated"] += 1
                summary["routeAccountsUpdated"] += 1
                route_account_id = existing.id
            else:
                action = "unchanged"
                summary["unchanged"] += 1
                route_account_id = existing.id

            items.append(
                AssignmentPlanItem(
                    request=request,
                    action=action,
                    reason=None,
                    staging_item_id=staging.id,
                    route_id=route.id,
                    rep_id=rep.id,
                    route_account_id=route_account_id,
                    visit_frequency=visit_frequency,
                )
            )

    return AssignmentPlan(items=items, summary=summary)


def _audit_from_summary(*, actor_user_id: int, dry_run: bool, summary: dict[str, Any], status: str) -> CustomerRouteAssignmentRun:
    return CustomerRouteAssignmentRun(
        actor_user_id=actor_user_id,
        dry_run=dry_run,
        status=status,
        total_rows=summary["totalRows"],
        created_count=summary["created"],
        updated_count=summary["updated"],
        unchanged_count=summary["unchanged"],
        skipped_count=summary["skipped"],
        blocked_count=summary["blocked"],
        route_accounts_created_count=summary["routeAccountsCreated"],
        route_accounts_updated_count=summary["routeAccountsUpdated"],
        blocked_counts_json=json.dumps(summary["blockedReasons"], ensure_ascii=False, sort_keys=True),
    )


def apply_route_assignment_plan(
    db: Session,
    plan: AssignmentPlan,
    *,
    actor_user_id: int,
) -> dict[str, Any]:
    summary = dict(plan.summary)
    status = "applied_with_blocks" if summary["blocked"] else "applied"
    audit = _audit_from_summary(actor_user_id=actor_user_id, dry_run=False, summary=summary, status=status)
    db.add(audit)
    db.flush()

    now = datetime.now(timezone.utc)
    for item in plan.items:
        staging = db.get(CustomerImportStagingItem, item.staging_item_id)
        if staging is None:
            continue

        if item.action == "blocked":
            staging.assignment_status = "blocked"
            staging.assignment_blocker = item.reason
            staging.reviewed_by_user_id = actor_user_id
            staging.reviewed_at = now
            continue

        if item.action == "created":
            route_account = RouteAccount(
                route_id=item.route_id,
                account_type=staging.customer_type,
                doctor_id=staging.doctor_id if staging.customer_type == "doctor" else None,
                pharmacy_id=staging.pharmacy_id if staging.customer_type == "pharmacy" else None,
                visit_frequency=item.visit_frequency,
            )
            db.add(route_account)
            db.flush()
        else:
            route_account = db.get(RouteAccount, item.route_account_id)
            if route_account is None:
                continue
            if item.action == "updated":
                route_account.visit_frequency = item.visit_frequency

        staging.assigned_rep_user_id = item.rep_id
        staging.route_id = item.route_id
        staging.route_account_id = route_account.id
        staging.assignment_status = "applied"
        staging.assignment_blocker = None
        staging.reviewed_by_user_id = actor_user_id
        staging.reviewed_at = now

    db.commit()
    summary["audit"] = {"persisted": True, "runId": audit.id, "status": status}
    return summary


def plan_or_apply_route_assignments(
    db: Session,
    assignments: list[AssignmentApplyInput],
    *,
    dry_run: bool,
    actor_user_id: int,
) -> dict[str, Any]:
    plan = build_route_assignment_plan(db, assignments, dry_run=dry_run)
    if dry_run:
        return plan.summary
    return apply_route_assignment_plan(db, plan, actor_user_id=actor_user_id)
