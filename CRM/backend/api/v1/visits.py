from __future__ import annotations

from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, has_any_role, require_roles
from models.crm import Doctor, Pharmacy, User, Visit
from schemas.common import PaginatedResponse
from schemas.crm import VisitCreate, VisitOut, VisitUpdate

router = APIRouter(
    prefix="/visits",
    tags=["visits"],
    dependencies=[Depends(get_current_user)],
)


def _base_visit_query(
    db: Session,
    current_user: User,
    *,
    rep_id: int | None = None,
    doctor_id: int | None = None,
    pharmacy_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
):
    query = (
        db.query(Visit)
        .options(
            selectinload(Visit.rep).selectinload(User.role),
            selectinload(Visit.doctor),
            selectinload(Visit.pharmacy),
        )
        .filter(Visit.is_deleted.is_(False))
    )

    effective_rep_id = rep_id
    if has_any_role(current_user, ["medical_rep"]):
        effective_rep_id = current_user.id

    if effective_rep_id:
        query = query.filter(Visit.rep_id == effective_rep_id)
    if doctor_id:
        query = query.filter(Visit.doctor_id == doctor_id)
    if pharmacy_id:
        query = query.filter(Visit.pharmacy_id == pharmacy_id)
    if date_from:
        query = query.filter(Visit.visit_date >= date_from)
    if date_to:
        query = query.filter(Visit.visit_date <= date_to)

    return query


def _percent_change(previous: int, current: int) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    delta = (current - previous) / previous * 100
    return round(delta, 1)


def _serialize_dashboard_visit(visit: Visit) -> dict:
    account = None
    if visit.doctor:
        account = {
            "id": visit.doctor.id,
            "name": visit.doctor.name,
            "city": visit.doctor.city,
            "type": "doctor",
        }
    elif visit.pharmacy:
        account = {
            "id": visit.pharmacy.id,
            "name": visit.pharmacy.name,
            "city": visit.pharmacy.city,
            "type": "pharmacy",
        }

    return {
        "id": visit.id,
        "visitDate": visit.visit_date.isoformat(),
        "status": visit.status or "completed",
        "durationMinutes": visit.duration_minutes or 0,
        "notes": visit.notes,
        "rep": {"id": visit.rep.id, "name": visit.rep.name} if visit.rep else None,
        "hcp": account,
    }


@router.get("/summary")
def visits_summary(
    rep_id: int | None = None,
    doctor_id: int | None = None,
    pharmacy_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    base_query = _base_visit_query(
        db,
        current_user,
        rep_id=rep_id,
        doctor_id=doctor_id,
        pharmacy_id=pharmacy_id,
    )

    status_counts = {
        status or "completed": count
        for status, count in base_query.with_entities(Visit.status, func.count(Visit.id)).group_by(Visit.status)
    }
    total = sum(status_counts.values())
    completed = status_counts.get("completed", 0)
    scheduled = status_counts.get("scheduled", 0)
    cancelled = status_counts.get("cancelled", 0)

    today = date.today()
    current_week_start = today - timedelta(days=today.weekday())
    current_week_end = current_week_start + timedelta(days=7)
    previous_week_start = current_week_start - timedelta(days=7)

    def _count_between(start: date, end: date, *, status: str | None = None) -> int:
        filters = [Visit.visit_date >= start, Visit.visit_date < end]
        if status:
            filters.append(Visit.status == status)
        return base_query.filter(*filters).count()

    current_week_total = _count_between(current_week_start, current_week_end)
    previous_week_total = _count_between(previous_week_start, current_week_start)

    current_week_completed = _count_between(current_week_start, current_week_end, status="completed")
    previous_week_completed = _count_between(previous_week_start, current_week_start, status="completed")

    current_week_scheduled = _count_between(current_week_start, current_week_end, status="scheduled")
    previous_week_scheduled = _count_between(previous_week_start, current_week_start, status="scheduled")

    current_week_cancelled = _count_between(current_week_start, current_week_end, status="cancelled")
    previous_week_cancelled = _count_between(previous_week_start, current_week_start, status="cancelled")

    week_over_week = {
        "totalVisits": _percent_change(previous_week_total, current_week_total),
        "completedVisits": _percent_change(previous_week_completed, current_week_completed),
        "scheduledVisits": _percent_change(previous_week_scheduled, current_week_scheduled),
        "cancelledVisits": _percent_change(previous_week_cancelled, current_week_cancelled),
    }

    return {
        "totalVisits": total,
        "completedVisits": completed,
        "scheduledVisits": scheduled,
        "cancelledVisits": cancelled,
        "weekOverWeek": week_over_week,
        "totalVisitsDelta": week_over_week["totalVisits"],
        "completedVisitsDelta": week_over_week["completedVisits"],
        "scheduledVisitsDelta": week_over_week["scheduledVisits"],
        "cancelledVisitsDelta": week_over_week["cancelledVisits"],
    }


@router.get("/latest")
def latest_visits(
    page_size: int = Query(5, ge=1, le=50, alias="page_size"),
    page_size_camel: int | None = Query(None, ge=1, le=50, alias="pageSize"),
    rep_id: int | None = None,
    doctor_id: int | None = None,
    pharmacy_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    query = _base_visit_query(
        db,
        current_user,
        rep_id=rep_id,
        doctor_id=doctor_id,
        pharmacy_id=pharmacy_id,
    )

    effective_page_size = page_size_camel or page_size
    max_rows = clamp_page_size(effective_page_size)
    visits = (
        query.order_by(Visit.visit_date.desc(), Visit.id.desc())
        .limit(max_rows)
        .all()
    )

    return {"data": [_serialize_dashboard_visit(visit) for visit in visits]}


@router.get("/", response_model=PaginatedResponse[VisitOut])
def list_visits(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    rep_id: int | None = None,
    doctor_id: int | None = None,
    pharmacy_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[VisitOut]:
    query = _base_visit_query(
        db,
        current_user,
        rep_id=rep_id,
        doctor_id=doctor_id,
        pharmacy_id=pharmacy_id,
        date_from=date_from,
        date_to=date_to,
    )

    page_size = clamp_page_size(page_size)
    visits, total = paginate(query.order_by(Visit.visit_date.desc(), Visit.id.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=visits,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


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

    visit = Visit(**payload.model_dump())
    db.add(visit)
    db.commit()
    return (
        _base_visit_query(db, current_user)
        .filter(Visit.id == visit.id)
        .first()
    )


def _get_visit(db: Session, visit_id: int) -> Visit:
    visit = (
        db.query(Visit)
        .options(
            selectinload(Visit.rep).selectinload(User.role),
            selectinload(Visit.doctor),
            selectinload(Visit.pharmacy),
        )
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
