from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Doctor, User
from schemas.common import PaginatedResponse
from schemas.crm import DoctorCreate, DoctorOut, DoctorUpdate

router = APIRouter(
    prefix="/doctors",
    tags=["doctors"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[DoctorOut])
def list_doctors(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    area: str | None = None,
    city: str | None = None,
    classification: str | None = Query(None, pattern="^[ABC]$"),
    search: str | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[DoctorOut]:
    query = db.query(Doctor)
    if area:
        query = query.filter(Doctor.area.ilike(f"%{area}%"))
    if city:
        query = query.filter(Doctor.city.ilike(f"%{city}%"))
    if classification:
        query = query.filter(Doctor.classification == classification)
    if search:
        lowered = f"%{search.lower()}%"
        query = query.filter(func.lower(Doctor.name).like(lowered))

    page_size = clamp_page_size(page_size)
    doctors, total = paginate(query.order_by(Doctor.name.asc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=doctors,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=DoctorOut,
    dependencies=[Depends(require_roles("sales_manager", "admin", "medical_rep"))],
)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db)) -> Doctor:
    doctor = Doctor(**payload.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@router.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: int, db: Session = Depends(get_db)) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")
    return doctor


@router.put(
    "/{doctor_id}",
    response_model=DoctorOut,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def update_doctor(doctor_id: int, payload: DoctorUpdate, db: Session = Depends(get_db)) -> Doctor:
    doctor = db.get(Doctor, doctor_id)
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(doctor, key, value)
    db.commit()
    db.refresh(doctor)
    return doctor
