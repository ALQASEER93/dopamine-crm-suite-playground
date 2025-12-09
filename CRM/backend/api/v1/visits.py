from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Doctor, Pharmacy, User, Visit
from schemas.common import PaginatedResponse
from schemas.crm import VisitCreate, VisitOut

router = APIRouter(
    prefix="/visits",
    tags=["visits"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[VisitOut])
def list_visits(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    rep_id: int | None = None,
    doctor_id: int | None = None,
    pharmacy_id: int | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[VisitOut]:
    query = db.query(Visit)
    if rep_id:
        query = query.filter(Visit.rep_id == rep_id)
    if doctor_id:
        query = query.filter(Visit.doctor_id == doctor_id)
    if pharmacy_id:
        query = query.filter(Visit.pharmacy_id == pharmacy_id)
    if date_from:
        query = query.filter(Visit.visit_date >= date_from)
    if date_to:
        query = query.filter(Visit.visit_date <= date_to)

    page_size = clamp_page_size(page_size)
    visits, total = paginate(query.order_by(Visit.visit_date.desc()), page, page_size)
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
def create_visit(payload: VisitCreate, db: Session = Depends(get_db)) -> Visit:
    if payload.doctor_id and not db.get(Doctor, payload.doctor_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found.")
    if payload.pharmacy_id and not db.get(Pharmacy, payload.pharmacy_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pharmacy not found.")
    if not db.get(User, payload.rep_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rep not found.")

    visit = Visit(**payload.model_dump())
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return visit
