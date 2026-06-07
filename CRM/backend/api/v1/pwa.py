from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from api.v1.utils_gps import GPSValidationError, validate_accuracy
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Doctor, Pharmacy, Route, RouteAccount, User, Visit

router = APIRouter(
    prefix="/pwa",
    tags=["pwa"],
    dependencies=[Depends(get_current_user)],
)

_PWA_ALLOWED_STATUSES = {"", "scheduled", "reminder", "pending"}
_PWA_LIFECYCLE_FIELDS = {
    "status",
    "visitDate",
    "visit_date",
    "date",
    "visitedAt",
    "startedAt",
    "endedAt",
    "duration",
    "durationSeconds",
    "duration_seconds",
    "durationMinutes",
    "duration_minutes",
    "coordinates",
    "startLat",
    "startLng",
    "startAccuracy",
    "endLat",
    "endLng",
    "endAccuracy",
}
_DEMO_CUSTOMER_NAMES = {
    "Dr. Lina Haddad",
    "Dr. Omar Saleh",
    "Dr. Rana Qasem",
    "WellCare Pharmacy",
    "CityCare Pharmacy",
    "Hope Pharmacy",
}


def _is_demo_customer(name: str | None) -> bool:
    return bool(name and name.strip() in _DEMO_CUSTOMER_NAMES)


def _display_customer_name(name: str | None) -> str:
    if not name:
        return ""
    return f"[DEMO] {name}" if _is_demo_customer(name) and not name.startswith("[DEMO]") else name


def _monthly_target_from_frequency(value: str | None) -> int | None:
    normalized = (value or "").strip().lower().replace("_", "-")
    if not normalized:
        return None
    if normalized in {"weekly", "1/week", "every-week"}:
        return 4
    if normalized in {"bi-weekly", "biweekly", "every-2-weeks", "fortnightly"}:
        return 2
    if normalized in {"monthly", "1/month"}:
        return 1
    if normalized in {"quarterly"}:
        return 0
    return None


def _format_address(*parts: Optional[str]) -> Optional[str]:
    cleaned = [part.strip() for part in parts if part and part.strip()]
    return ", ".join(cleaned) if cleaned else None


def _validate_pwa_create_payload(payload: dict) -> None:
    status_value = str(payload.get("status", "") or "").strip().lower()
    if status_value not in _PWA_ALLOWED_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Visit lifecycle fields can only be changed through start/end endpoints.",
        )
    if any(key in payload for key in _PWA_LIFECYCLE_FIELDS - {"status"}):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Use visits start/end endpoints for lifecycle timestamps, GPS and duration.",
        )


@router.get("/customers")
def list_customers(
    search: Optional[str] = None,
    type: Optional[str] = Query(default=None, alias="type"),
    area: Optional[str] = None,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _user: User = Depends(require_roles("sales_manager", "medical_rep", "admin")),
) -> list[dict]:
    normalized_type = (type or "").lower()
    results: list[dict] = []
    route_accounts = (
        db.query(RouteAccount)
        .options(joinedload(RouteAccount.route).joinedload(Route.rep))
        .all()
    )
    assignment_by_customer = {
        (account.account_type, str(account.doctor_id or account.pharmacy_id)): account
        for account in route_accounts
        if account.doctor_id or account.pharmacy_id
    }

    def assignment_meta(customer_type: str, customer_id: int) -> dict:
        account = assignment_by_customer.get((customer_type, str(customer_id)))
        if not account:
            return {
                "assignedRepEmail": None,
                "visitFrequency": None,
                "monthlyFrequencyTarget": None,
                "frequencyPlanSource": "none",
            }
        target = _monthly_target_from_frequency(account.visit_frequency or account.route.frequency)
        return {
            "assignedRepEmail": account.route.rep.email if account.route and account.route.rep else None,
            "visitFrequency": account.visit_frequency or account.route.frequency,
            "monthlyFrequencyTarget": target,
            "frequencyPlanSource": "route",
            "isAssignedToCurrentRep": bool(account.route and account.route.rep_id == current_user.id),
        }

    if normalized_type in {"", "doctor"}:
        query = db.query(Doctor)
        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    Doctor.name.ilike(term),
                    Doctor.specialty.ilike(term),
                    Doctor.area.ilike(term),
                    Doctor.city.ilike(term),
                )
            )
        if area:
            query = query.filter(Doctor.area.ilike(f"%{area.strip().lower()}%"))
        if specialty:
            query = query.filter(Doctor.specialty.ilike(f"%{specialty.strip().lower()}%"))

        for doc in query.order_by(Doctor.name.asc()).all():
            meta = assignment_meta("doctor", doc.id)
            results.append(
                {
                    "id": str(doc.id),
                    "name": _display_customer_name(doc.name),
                    "rawName": doc.name,
                    "type": "doctor",
                    "area": doc.area,
                    "specialty": doc.specialty,
                    "phone": doc.phone,
                    "address": _format_address(doc.clinic, doc.area, doc.city),
                    "lastVisit": None,
                    "location": None,
                    "isDemo": _is_demo_customer(doc.name),
                    "dataOrigin": "DEMO_SEED" if _is_demo_customer(doc.name) else "UNVERIFIED_SOURCE",
                    **meta,
                }
            )

    if normalized_type in {"", "pharmacy"}:
        query = db.query(Pharmacy)
        if search:
            term = f"%{search.strip().lower()}%"
            query = query.filter(
                or_(
                    Pharmacy.name.ilike(term),
                    Pharmacy.area.ilike(term),
                    Pharmacy.city.ilike(term),
                )
            )
        if area:
            query = query.filter(Pharmacy.area.ilike(f"%{area.strip().lower()}%"))

        for pharmacy in query.order_by(Pharmacy.name.asc()).all():
            meta = assignment_meta("pharmacy", pharmacy.id)
            results.append(
                {
                    "id": str(pharmacy.id),
                    "name": _display_customer_name(pharmacy.name),
                    "rawName": pharmacy.name,
                    "type": "pharmacy",
                    "area": pharmacy.area,
                    "specialty": None,
                    "phone": pharmacy.phone,
                    "address": _format_address(pharmacy.area, pharmacy.city),
                    "lastVisit": None,
                    "location": None,
                    "isDemo": _is_demo_customer(pharmacy.name),
                    "dataOrigin": "DEMO_SEED" if _is_demo_customer(pharmacy.name) else "UNVERIFIED_SOURCE",
                    **meta,
                }
            )

    return results


def _map_visit_status(status: str | None) -> str:
    if status == "completed":
        return "success"
    if status == "cancelled":
        return "no-show"
    if status == "in_progress":
        return "in_progress"
    return "scheduled"


@router.get("/visits")
def list_visits(
    date_value: Optional[str] = Query(default=None, alias="date"),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    customer_id: Optional[str] = Query(default=None, alias="customerId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("sales_manager", "medical_rep", "admin")),
) -> list[dict]:
    query = db.query(Visit).filter(Visit.is_deleted.is_(False), Visit.rep_id == current_user.id)
    if date_value:
        try:
            parsed = date.fromisoformat(date_value)
            query = query.filter(Visit.visit_date == parsed)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format.") from exc
    if customer_id:
        if customer_id.isdigit():
            parsed_id = int(customer_id)
            query = query.filter(or_(Visit.doctor_id == parsed_id, Visit.pharmacy_id == parsed_id))

    visits = query.all()
    results = []
    for visit in visits:
        customer_type = "doctor" if visit.doctor_id else "pharmacy"
        customer_id_value = visit.doctor_id or visit.pharmacy_id
        customer_name = None
        if visit.doctor:
            customer_name = visit.doctor.name
        elif visit.pharmacy:
            customer_name = visit.pharmacy.name

        results.append(
            {
                "id": str(visit.id),
                "repId": str(visit.rep_id),
                "customerId": str(customer_id_value) if customer_id_value else "",
                "customerName": customer_name or "",
                "customerType": customer_type,
                "visitType": "follow-up",
                "status": _map_visit_status(visit.status),
                "serverStatus": visit.status,
                "notes": visit.notes,
                "coordinates": {
                    "lat": visit.start_lat,
                    "lng": visit.start_lng,
                }
                if visit.start_lat is not None and visit.start_lng is not None
                else None,
                "visitedAt": (visit.started_at or datetime.combine(visit.visit_date, datetime.min.time(), tzinfo=timezone.utc)).isoformat()
                if visit.visit_date
                else None,
                "startedAt": visit.started_at.isoformat() if visit.started_at else None,
                "endedAt": visit.ended_at.isoformat() if visit.ended_at else None,
                "durationSeconds": visit.duration_seconds,
                "startAccuracy": visit.start_accuracy,
                "endAccuracy": visit.end_accuracy,
                "endCoordinates": {
                    "lat": visit.end_lat,
                    "lng": visit.end_lng,
                }
                if visit.end_lat is not None and visit.end_lng is not None
                else None,
            }
        )

    if status_filter:
        status_filter = status_filter.strip().lower()
        results = [visit for visit in results if visit.get("status") == status_filter]

    return results


@router.post("/visits", status_code=status.HTTP_201_CREATED)
def create_visit(
    payload: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _user: User = Depends(require_roles("sales_manager", "medical_rep", "admin")),
) -> dict:
    _validate_pwa_create_payload(payload)
    customer_id = payload.get("customerId")
    customer_type = payload.get("customerType")
    if not customer_id or not customer_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Customer is required.")

    doctor_id = None
    pharmacy_id = None
    if customer_type == "doctor":
        doctor_id = int(customer_id)
        if not db.get(Doctor, doctor_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found.")
    elif customer_type == "pharmacy":
        pharmacy_id = int(customer_id)
        if not db.get(Pharmacy, pharmacy_id):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pharmacy not found.")
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid customer type.")

    # Lifecycle integrity: PWA creation only schedules a visit.
    # Start/end timestamps and GPS are accepted only via /visits/{id}/start and /visits/{id}/end.
    visit_date = date.today()
    visited_at = datetime.now(timezone.utc).isoformat()
    visit = Visit(
        visit_date=visit_date,
        rep_id=current_user.id,
        doctor_id=doctor_id,
        pharmacy_id=pharmacy_id,
        notes=payload.get("notes"),
        status="scheduled",
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)

    return {
        "id": str(visit.id),
        "repId": str(visit.rep_id),
        "customerId": str(doctor_id or pharmacy_id),
        "customerName": payload.get("customerName") or "",
        "customerType": customer_type,
        "visitType": payload.get("visitType") or "follow-up",
        "status": "scheduled",
        "serverStatus": "scheduled",
        "notes": visit.notes,
        "coordinates": None,
        "visitedAt": visited_at,
    }


@router.post("/tracking/pings")
def tracking_ping(
    payload: dict,
    _user: User = Depends(require_roles("sales_manager", "medical_rep", "admin")),
) -> dict:
    try:
        validate_accuracy(payload.get("accuracy"))
    except GPSValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"success": True}
