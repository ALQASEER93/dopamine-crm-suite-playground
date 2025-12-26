from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from core.db import get_db
from core.security import get_current_user
from models.crm import Doctor, Pharmacy, User, Visit

router = APIRouter(
    prefix="/pwa",
    tags=["pwa"],
    dependencies=[Depends(get_current_user)],
)


def _format_address(*parts: Optional[str]) -> Optional[str]:
    cleaned = [part.strip() for part in parts if part and part.strip()]
    return ", ".join(cleaned) if cleaned else None


@router.get("/customers")
def list_customers(
    search: Optional[str] = None,
    type: Optional[str] = Query(default=None, alias="type"),
    area: Optional[str] = None,
    specialty: Optional[str] = None,
    db: Session = Depends(get_db),
) -> list[dict]:
    normalized_type = (type or "").lower()
    results: list[dict] = []

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
            results.append(
                {
                    "id": str(doc.id),
                    "name": doc.name,
                    "type": "doctor",
                    "area": doc.area,
                    "specialty": doc.specialty,
                    "phone": doc.phone,
                    "address": _format_address(doc.clinic, doc.area, doc.city),
                    "lastVisit": None,
                    "location": None,
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
            results.append(
                {
                    "id": str(pharmacy.id),
                    "name": pharmacy.name,
                    "type": "pharmacy",
                    "area": pharmacy.area,
                    "specialty": None,
                    "phone": pharmacy.phone,
                    "address": _format_address(pharmacy.area, pharmacy.city),
                    "lastVisit": None,
                    "location": None,
                }
            )

    return results


def _map_visit_status(status: str | None) -> str:
    if status == "completed":
        return "success"
    if status == "cancelled":
        return "no-show"
    return "reminder"


@router.get("/visits")
def list_visits(
    date_value: Optional[str] = Query(default=None, alias="date"),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    customer_id: Optional[str] = Query(default=None, alias="customerId"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
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
) -> dict:
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

    status_map = {
        "success": "completed",
        "no-show": "cancelled",
        "refused": "cancelled",
    }
    normalized_status = status_map.get(payload.get("status"), "scheduled")

    visited_at = payload.get("visitedAt")
    visit_date = date.today()
    started_at = None
    ended_at = None
    if visited_at:
        try:
            parsed = datetime.fromisoformat(visited_at)
            visit_date = parsed.date()
            started_at = parsed
            if normalized_status == "completed":
                ended_at = parsed
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid visitedAt format.") from exc

    coordinates = payload.get("coordinates") or {}
    visit = Visit(
        visit_date=visit_date,
        rep_id=current_user.id,
        doctor_id=doctor_id,
        pharmacy_id=pharmacy_id,
        notes=payload.get("notes"),
        status=normalized_status,
        started_at=started_at,
        ended_at=ended_at,
        start_lat=coordinates.get("lat"),
        start_lng=coordinates.get("lng"),
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
        "status": payload.get("status") or "success",
        "notes": visit.notes,
        "coordinates": coordinates if coordinates else None,
        "visitedAt": visited_at or datetime.now(timezone.utc).isoformat(),
    }


@router.post("/tracking/pings")
def tracking_ping(payload: dict) -> dict:
    return {"success": True}
