from __future__ import annotations

from datetime import date, datetime, timezone
import csv
import io
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Response, UploadFile, File, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from api.v1.utils_gps import (
    GPSValidationError,
    haversine_distance_m,
    validate_accuracy,
    validate_geofence_distance,
)
from core.db import get_db
from core.security import get_current_user, has_any_role, require_roles
from models.crm import Doctor, Pharmacy, User, Visit, VisitAttachment
from schemas.common import PaginatedResponse
from schemas.crm import VisitAttachmentOut, VisitCreate, VisitEnd, VisitOut, VisitStart, VisitUpdate

router = APIRouter(
    prefix="/visits",
    tags=["visits"],
    dependencies=[Depends(get_current_user)],
)

VISIT_STATUSES = {"SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELED", "NO_SHOW"}
VISIT_STATUS_ALIASES = {
    "scheduled": "SCHEDULED",
    "in_progress": "IN_PROGRESS",
    "completed": "COMPLETED",
    "cancelled": "CANCELED",
    "canceled": "CANCELED",
    "no_show": "NO_SHOW",
    "no-show": "NO_SHOW",
}


def _calculate_duration_seconds(started_at: datetime | None, ended_at: datetime | None) -> int | None:
    if not started_at or not ended_at:
        return None
    if started_at.tzinfo is None and ended_at.tzinfo:
        started_at = started_at.replace(tzinfo=ended_at.tzinfo)
    if ended_at.tzinfo is None and started_at.tzinfo:
        ended_at = ended_at.replace(tzinfo=started_at.tzinfo)
    delta = (ended_at - started_at).total_seconds()
    return max(int(delta), 0)


def _normalize_status_filters(status_filters: list[str] | None) -> list[str]:
    if not status_filters:
        return []
    normalized = []
    for candidate in status_filters:
        if not candidate:
            continue
        value = candidate.strip().lower()
        mapped = VISIT_STATUS_ALIASES.get(value, candidate.strip().upper())
        if mapped in VISIT_STATUSES:
            normalized.append(mapped)
    # Preserve order while de-duplicating
    return list(dict.fromkeys(normalized))


def _sync_duration(visit: Visit) -> None:
    duration = _calculate_duration_seconds(visit.started_at, visit.ended_at)
    if duration is not None:
        visit.duration_seconds = duration


def _enforce_gps_policy(
    *,
    accuracy: float | None,
    override_reason: str | None,
    distance_m: float | None = None,
) -> None:
    """Raise HTTPException when GPS policy fails without an override reason."""
    errors = []
    try:
        validate_accuracy(accuracy)
    except GPSValidationError as exc:
        errors.append(str(exc))

    if distance_m is not None:
        try:
            validate_geofence_distance(distance_m)
        except GPSValidationError as exc:
            errors.append(str(exc))

    if errors and not (override_reason and override_reason.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=" | ".join(errors),
        )


@router.get("/", response_model=PaginatedResponse[VisitOut])
def list_visits(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    rep_ids: list[int] | None = Query(default=None, alias="rep_id"),
    doctor_id: int | None = None,
    pharmacy_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status_filter: list[str] | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[VisitOut]:
    query = (
        db.query(Visit)
        .options(joinedload(Visit.doctor), joinedload(Visit.pharmacy), joinedload(Visit.rep))
        .filter(Visit.is_deleted.is_(False))
    )

    effective_rep_ids = rep_ids or []
    if has_any_role(current_user, ["medical_rep"]):
        effective_rep_ids = [current_user.id]

    if effective_rep_ids:
        query = query.filter(Visit.rep_id.in_(effective_rep_ids))
    if doctor_id:
        query = query.filter(Visit.doctor_id == doctor_id)
    if pharmacy_id:
        query = query.filter(Visit.pharmacy_id == pharmacy_id)
    if date_from:
        query = query.filter(Visit.visit_date >= date_from)
    if date_to:
        query = query.filter(Visit.visit_date <= date_to)
    allowed_statuses = _normalize_status_filters(status_filter)
    if allowed_statuses:
        query = query.filter(Visit.status.in_(allowed_statuses))

    page_size = clamp_page_size(page_size)
    visits, total = paginate(
        query.order_by(
            Visit.started_at.desc().nullslast(),
            Visit.visit_date.desc(),
            Visit.id.desc(),
        ),
        page,
        page_size,
    )
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=visits,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.get("/export", dependencies=[Depends(require_roles("sales_manager", "admin"))])
def export_visits(
    rep_ids: list[int] | None = Query(default=None, alias="rep_id"),
    doctor_id: int | None = None,
    pharmacy_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status_filter: list[str] | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    query = (
        db.query(Visit)
        .options(joinedload(Visit.doctor), joinedload(Visit.pharmacy), joinedload(Visit.rep))
        .filter(Visit.is_deleted.is_(False))
    )

    effective_rep_ids = rep_ids or []
    if has_any_role(current_user, ["medical_rep"]):
        effective_rep_ids = [current_user.id]

    if effective_rep_ids:
        query = query.filter(Visit.rep_id.in_(effective_rep_ids))
    if doctor_id:
        query = query.filter(Visit.doctor_id == doctor_id)
    if pharmacy_id:
        query = query.filter(Visit.pharmacy_id == pharmacy_id)
    if date_from:
        query = query.filter(Visit.visit_date >= date_from)
    if date_to:
        query = query.filter(Visit.visit_date <= date_to)
    allowed_statuses = _normalize_status_filters(status_filter)
    if allowed_statuses:
        query = query.filter(Visit.status.in_(allowed_statuses))

    visits = query.order_by(
        Visit.started_at.desc().nullslast(),
        Visit.visit_date.desc(),
        Visit.id.desc(),
    ).all()

    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "id",
            "visitDate",
            "status",
            "durationMinutes",
            "repName",
            "repEmail",
            "accountName",
            "accountType",
            "notes",
        ],
    )
    writer.writeheader()

    for visit in visits:
        duration_minutes = None
        if visit.duration_seconds is not None:
            duration_minutes = round(visit.duration_seconds / 60, 2)
        elif visit.started_at and visit.ended_at:
            duration_minutes = round((visit.ended_at - visit.started_at).total_seconds() / 60, 2)

        account_name = None
        account_type = None
        if visit.doctor:
            account_name = visit.doctor.name
            account_type = "doctor"
        elif visit.pharmacy:
            account_name = visit.pharmacy.name
            account_type = "pharmacy"

        writer.writerow(
            {
                "id": visit.id,
                "visitDate": visit.visit_date.isoformat() if visit.visit_date else "",
            "status": visit.status,
                "durationMinutes": duration_minutes if duration_minutes is not None else "",
                "repName": visit.rep.name if visit.rep else "",
                "repEmail": visit.rep.email if visit.rep else "",
                "accountName": account_name or "",
                "accountType": account_type or "",
                "notes": visit.notes or "",
            }
        )

    headers = {"Content-Disposition": 'attachment; filename="visits.csv"'}
    return Response(content=buffer.getvalue(), media_type="text/csv", headers=headers)


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=VisitOut,
    dependencies=[Depends(require_roles("sales_manager", "medical_rep", "admin"))],
)
def create_visit(
    payload: VisitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Visit:
    if payload.doctor_id and not db.get(Doctor, payload.doctor_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found.")
    if payload.pharmacy_id and not db.get(Pharmacy, payload.pharmacy_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pharmacy not found.")
    rep = db.get(User, payload.rep_id)
    if not rep:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rep not found.")
    if has_any_role(current_user, ["medical_rep"]) and payload.rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed to assign another rep.")

    visit_payload = payload.model_dump()
    visit_payload["status"] = "SCHEDULED"
    visit = Visit(**visit_payload)
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit


@router.get("/summary")
def visits_summary(
    rep_ids: list[int] | None = Query(default=None, alias="rep_id"),
    doctor_id: int | None = None,
    pharmacy_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    status_filter: list[str] | None = Query(default=None, alias="status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    base_query = db.query(Visit).filter(Visit.is_deleted.is_(False))
    effective_rep_ids = rep_ids or []
    if has_any_role(current_user, ["medical_rep"]):
        effective_rep_ids = [current_user.id]

    if effective_rep_ids:
        base_query = base_query.filter(Visit.rep_id.in_(effective_rep_ids))
    if doctor_id:
        base_query = base_query.filter(Visit.doctor_id == doctor_id)
    if pharmacy_id:
        base_query = base_query.filter(Visit.pharmacy_id == pharmacy_id)
    if date_from:
        base_query = base_query.filter(Visit.visit_date >= date_from)
    if date_to:
        base_query = base_query.filter(Visit.visit_date <= date_to)
    allowed_statuses = _normalize_status_filters(status_filter)
    if allowed_statuses:
        base_query = base_query.filter(Visit.status.in_(allowed_statuses))

    total_visits = base_query.count()
    completed_visits = base_query.filter(Visit.status == "COMPLETED").count()
    scheduled_visits = base_query.filter(Visit.status == "SCHEDULED").count()
    cancelled_visits = base_query.filter(Visit.status.in_(["CANCELED", "NO_SHOW"])).count()
    in_progress_visits = base_query.filter(Visit.status == "IN_PROGRESS").count()

    duration_sum, duration_count = (
        base_query.filter(Visit.duration_seconds.isnot(None))
        .with_entities(func.sum(Visit.duration_seconds), func.count(Visit.id))
        .first()
    )
    avg_duration_minutes = (
        round(float(duration_sum or 0) / 60 / max(duration_count, 1), 2) if duration_count else 0.0
    )

    last_visit = (
        base_query.order_by(
            Visit.ended_at.desc().nullslast(),
            Visit.started_at.desc().nullslast(),
            Visit.visit_date.desc(),
            Visit.id.desc(),
        )
        .first()
    )
    last_activity = None
    if last_visit:
        last_activity = last_visit.ended_at or last_visit.started_at
        if not last_activity and last_visit.visit_date:
            last_activity = datetime.combine(
                last_visit.visit_date,
                datetime.min.time(),
                tzinfo=timezone.utc,
            )

    rep_rows = (
        base_query.join(User, User.id == Visit.rep_id)
        .with_entities(
            Visit.rep_id,
            User.name,
            User.email,
            func.count(Visit.id),
            func.sum(case((Visit.status == "COMPLETED", 1), else_=0)),
            func.sum(Visit.duration_seconds),
            func.max(func.coalesce(Visit.ended_at, Visit.started_at, Visit.visit_date)),
        )
        .group_by(Visit.rep_id, User.name, User.email)
        .all()
    )

    visits_by_rep = []
    for rep_id, rep_name, rep_email, total, completed_count, duration_total, last_seen in rep_rows:
        avg_minutes = None
        if duration_total:
            avg_minutes = round(float(duration_total) / 60 / max(total, 1), 2)
        if isinstance(last_seen, date) and not isinstance(last_seen, datetime):
            last_seen_str = datetime.combine(last_seen, datetime.min.time(), tzinfo=timezone.utc).isoformat()
        elif isinstance(last_seen, datetime):
            last_seen_str = last_seen.isoformat()
        else:
            last_seen_str = None
        visits_by_rep.append(
            {
                "repId": rep_id,
                "repName": rep_name or rep_email or f"Rep {rep_id}",
                "totalVisits": total,
                "completedVisits": int(completed_count or 0),
                "avgDurationMinutes": avg_minutes,
                "lastVisitAt": last_seen_str,
            }
        )

    completion_rate = round((completed_visits / total_visits) * 100, 2) if total_visits else 0.0
    data = {
        "totalVisits": total_visits,
        "completedVisits": completed_visits,
        "scheduledVisits": scheduled_visits,
        "cancelledVisits": cancelled_visits,
        "inProgressVisits": in_progress_visits,
        "completionRate": completion_rate,
        "avgDurationMinutes": avg_duration_minutes,
        "lastActivityAt": last_activity.isoformat() if isinstance(last_activity, datetime) else None,
        "visitsByRep": visits_by_rep,
    }
    return {"data": data}


def _serialize_dashboard_visit(visit: Visit) -> dict:
    rep = None
    if visit.rep:
        rep = {"id": visit.rep.id, "name": visit.rep.name or visit.rep.email}

    hcp = None
    account = None
    if visit.doctor:
        hcp = {"id": visit.doctor.id, "name": visit.doctor.name, "type": "doctor"}
        account = {"type": "doctor", "id": visit.doctor.id, "name": visit.doctor.name}
    elif visit.pharmacy:
        hcp = {"id": visit.pharmacy.id, "name": visit.pharmacy.name, "type": "pharmacy"}
        account = {"type": "pharmacy", "id": visit.pharmacy.id, "name": visit.pharmacy.name}

    duration_seconds = visit.duration_seconds or _calculate_duration_seconds(visit.started_at, visit.ended_at) or 0
    duration_minutes = round(duration_seconds / 60, 2) if duration_seconds else 0

    return {
        "id": visit.id,
        "visitDate": visit.visit_date.isoformat() if visit.visit_date else None,
        "startedAt": visit.started_at.isoformat() if visit.started_at else None,
        "endedAt": visit.ended_at.isoformat() if visit.ended_at else None,
        "rep": rep,
        "hcp": hcp,
        "account": account,
        "status": visit.status or "SCHEDULED",
        "durationMinutes": duration_minutes,
        "startLocation": {
            "lat": visit.start_lat,
            "lng": visit.start_lng,
            "accuracy": visit.start_accuracy_m,
        },
        "endLocation": {
            "lat": visit.end_lat,
            "lng": visit.end_lng,
            "accuracy": visit.end_accuracy_m,
        },
        "notes": visit.notes,
        "samplesGiven": visit.samples_given,
        "nextAction": visit.next_action,
        "nextActionDate": visit.next_action_date.isoformat() if visit.next_action_date else None,
    }


@router.get("/latest")
def latest_visits(
    page_size: int = Query(5, alias="pageSize", ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    page_size = clamp_page_size(page_size)
    query = (
        db.query(Visit)
        .options(joinedload(Visit.rep), joinedload(Visit.doctor), joinedload(Visit.pharmacy))
        .filter(Visit.is_deleted.is_(False))
        .order_by(
            Visit.ended_at.desc().nullslast(),
            Visit.started_at.desc().nullslast(),
            Visit.visit_date.desc(),
            Visit.id.desc(),
        )
    )

    if has_any_role(current_user, ["medical_rep"]):
        query = query.filter(Visit.rep_id == current_user.id)

    visits = query.limit(page_size).all()
    data = [_serialize_dashboard_visit(visit) for visit in visits]
    return {"data": data}


def _get_visit(db: Session, visit_id: int) -> Visit:
    visit = (
        db.query(Visit)
        .options(joinedload(Visit.rep), joinedload(Visit.doctor), joinedload(Visit.pharmacy))
        .filter(Visit.id == visit_id, Visit.is_deleted.is_(False))
        .first()
    )
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")
    return visit


@router.get("/{visit_id:int}", response_model=VisitOut)
def get_visit(visit_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Visit:
    visit = _get_visit(db, visit_id)
    if has_any_role(current_user, ["medical_rep"]) and visit.rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
    return visit


@router.put(
    "/{visit_id:int}",
    response_model=VisitOut,
    dependencies=[Depends(require_roles("sales_manager", "medical_rep", "admin"))],
)
def update_visit(
    visit_id: int,
    payload: VisitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Visit:
    visit = _get_visit(db, visit_id)
    if has_any_role(current_user, ["medical_rep"]) and visit.rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")

    updates = payload.model_dump(exclude_unset=True)
    if "status" in updates and updates["status"]:
        normalized = _normalize_status_filters([updates["status"]])
        updates["status"] = normalized[0] if normalized else updates["status"]
    if "doctor_id" in updates and updates["doctor_id"]:
        if not db.get(Doctor, updates["doctor_id"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found.")
    if "pharmacy_id" in updates and updates["pharmacy_id"]:
        if not db.get(Pharmacy, updates["pharmacy_id"]):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pharmacy not found.")
    if "rep_id" in updates and updates["rep_id"]:
        rep = db.get(User, updates["rep_id"])
        if not rep:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rep not found.")
        if has_any_role(current_user, ["medical_rep"]) and updates["rep_id"] != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted to reassign rep.")

    for key, value in updates.items():
        setattr(visit, key, value)

    if updates.get("status") == "COMPLETED" and not visit.ended_at:
        visit.ended_at = datetime.now(timezone.utc)
    if updates.get("status") == "IN_PROGRESS" and not visit.started_at:
        visit.started_at = datetime.now(timezone.utc)
    if any(field in updates for field in ("started_at", "ended_at", "duration_seconds", "status")):
        _sync_duration(visit)

    if not visit.doctor_id and not visit.pharmacy_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either doctor_id or pharmacy_id is required.",
        )
    if visit.doctor_id and visit.pharmacy_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide only one of doctor_id or pharmacy_id.",
        )

    db.commit()
    db.refresh(visit)
    return visit


@router.post(
    "/{visit_id:int}/start",
    response_model=VisitOut,
    dependencies=[Depends(require_roles("sales_manager", "medical_rep", "admin"))],
)
def start_visit(
    visit_id: int,
    payload: VisitStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Visit:
    visit = _get_visit(db, visit_id)
    if has_any_role(current_user, ["medical_rep"]) and visit.rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
    if visit.status != "SCHEDULED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Visit must be scheduled to start.")
    if visit.started_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Visit already started.")
    if payload.lat is None or payload.lng is None or payload.accuracy is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GPS location is required.")

    _enforce_gps_policy(
        accuracy=payload.accuracy,
        override_reason=payload.override_reason,
    )

    started_at = payload.started_at or datetime.now(timezone.utc)
    visit.started_at = started_at
    visit.start_lat = payload.lat
    visit.start_lng = payload.lng
    visit.start_accuracy_m = payload.accuracy
    visit.status = "IN_PROGRESS"
    if payload.override_reason:
        visit.override_reason = payload.override_reason.strip()
    _sync_duration(visit)

    db.commit()
    db.refresh(visit)
    return visit


@router.post(
    "/{visit_id:int}/end",
    response_model=VisitOut,
    dependencies=[Depends(require_roles("sales_manager", "medical_rep", "admin"))],
)
def end_visit(
    visit_id: int,
    payload: VisitEnd,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Visit:
    visit = _get_visit(db, visit_id)
    if has_any_role(current_user, ["medical_rep"]) and visit.rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
    if visit.status in {"CANCELED", "NO_SHOW"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cancelled visits cannot be completed.")
    if visit.status != "IN_PROGRESS":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Visit must be in progress to end.")
    if visit.ended_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Visit already ended.")
    if payload.lat is None or payload.lng is None or payload.accuracy is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="GPS location is required.")

    distance_m = None
    if visit.start_lat is not None and visit.start_lng is not None:
        distance_m = haversine_distance_m(
            visit.start_lat,
            visit.start_lng,
            payload.lat,
            payload.lng,
        )
    _enforce_gps_policy(
        accuracy=payload.accuracy,
        override_reason=payload.override_reason,
        distance_m=distance_m,
    )

    ended_at = payload.ended_at or datetime.now(timezone.utc)
    if not visit.started_at:
        visit.started_at = ended_at
    visit.ended_at = ended_at
    visit.end_lat = payload.lat
    visit.end_lng = payload.lng
    visit.end_accuracy_m = payload.accuracy
    visit.status = "COMPLETED"
    if payload.notes is not None:
        visit.notes = payload.notes
    if payload.did_samples is not None:
        visit.did_samples = payload.did_samples
    if payload.did_brochure is not None:
        visit.did_brochure = payload.did_brochure
    if payload.did_collection is not None:
        visit.did_collection = payload.did_collection
    if payload.did_order is not None:
        visit.did_order = payload.did_order
    if payload.override_reason:
        visit.override_reason = payload.override_reason.strip()
    _sync_duration(visit)

    db.commit()
    db.refresh(visit)
    return visit


@router.delete(
    "/{visit_id:int}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_roles("sales_manager", "medical_rep", "admin"))],
)
def delete_visit(
    visit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    visit = _get_visit(db, visit_id)
    if has_any_role(current_user, ["medical_rep"]) and visit.rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
    visit.is_deleted = True
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/{visit_id:int}/attachments",
    response_model=list[VisitAttachmentOut],
)
def list_visit_attachments(
    visit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[VisitAttachment]:
    visit = _get_visit(db, visit_id)
    if has_any_role(current_user, ["medical_rep"]) and visit.rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
    return list(visit.attachments or [])


@router.post(
    "/{visit_id:int}/attachments",
    response_model=VisitAttachmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "medical_rep", "admin"))],
)
async def upload_visit_attachment(
    visit_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> VisitAttachment:
    visit = _get_visit(db, visit_id)
    if has_any_role(current_user, ["medical_rep"]) and visit.rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")

    safe_name = Path(file.filename or "attachment").name
    attachment_id = uuid4().hex
    storage_dir = Path("CRM/backend/data/visit_attachments") / str(visit_id)
    storage_dir.mkdir(parents=True, exist_ok=True)
    final_name = f"{attachment_id}-{safe_name}"
    destination = storage_dir / final_name

    payload = await file.read()
    destination.write_bytes(payload)

    attachment = VisitAttachment(
        visit_id=visit_id,
        filename=safe_name,
        content_type=file.content_type,
        file_path=str(destination),
        size_bytes=len(payload),
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment
