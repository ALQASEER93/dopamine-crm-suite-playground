from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from core.db import get_db
from core.security import get_current_user, require_roles
from models.hcp import HCP

router = APIRouter(
    prefix="/hcps",
    tags=["hcps"],
    dependencies=[Depends(get_current_user)],
)

DEFAULT_PAGE = 1
DEFAULT_PAGE_SIZE = 25
MAX_PAGE_SIZE = 5000


def _serialize_hcp(hcp: HCP) -> dict:
    name = f"{hcp.first_name} {hcp.last_name}".strip()
    return {
        "id": hcp.id,
        "name": name,
        "areaTag": hcp.area,
        "specialty": hcp.specialty,
        "city": hcp.city,
        "area": hcp.area,
        "segment": None,
        "phone": hcp.phone,
        "mobile": None,
        "email": hcp.email,
        "createdAt": hcp.created_at,
        "updatedAt": hcp.updated_at,
    }


def _apply_filters(
    query,
    *,
    search: Optional[str],
    area_tag: Optional[str],
    specialty: Optional[str],
    segment: Optional[str],
):
    if search:
        term = f"%{search.strip().lower()}%"
        query = query.filter(
            or_(
                func.lower(HCP.first_name).like(term),
                func.lower(HCP.last_name).like(term),
                func.lower(HCP.specialty).like(term),
                func.lower(HCP.area).like(term),
                func.lower(HCP.city).like(term),
            )
        )
    if area_tag:
        term = f"%{area_tag.strip().lower()}%"
        query = query.filter(func.lower(HCP.area).like(term))
    if specialty:
        term = f"%{specialty.strip().lower()}%"
        query = query.filter(func.lower(HCP.specialty).like(term))
    if segment:
        term = f"%{segment.strip().lower()}%"
        query = query.filter(func.lower(HCP.area).like(term))
    return query


@router.get("", response_model=dict)
def list_hcps(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE, alias="pageSize"),
    search: Optional[str] = None,
    area_tag: Optional[str] = Query(default=None, alias="areaTag"),
    specialty: Optional[str] = None,
    segment: Optional[str] = None,
    db: Session = Depends(get_db),
):
    query = db.query(HCP).filter(HCP.is_active.is_(True))
    query = _apply_filters(
        query,
        search=search,
        area_tag=area_tag,
        specialty=specialty,
        segment=segment,
    )

    total = query.count()
    items = (
        query.order_by(HCP.last_name.asc(), HCP.first_name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    total_pages = (total + page_size - 1) // page_size if total else 0
    data = [_serialize_hcp(item) for item in items]
    return {
        "data": data,
        "meta": {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": total_pages,
        },
    }


@router.get("/{hcp_id}", response_model=dict)
def get_hcp(hcp_id: int, db: Session = Depends(get_db)) -> dict:
    hcp = db.query(HCP).filter(HCP.id == hcp_id, HCP.is_active.is_(True)).first()
    if not hcp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HCP not found.")
    return _serialize_hcp(hcp)


@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def create_hcp(
    payload: dict,
    db: Session = Depends(get_db),
):
    name = str(payload.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Name is required.")
    parts = name.split()
    first_name = parts[0]
    last_name = " ".join(parts[1:]) if len(parts) > 1 else "-"

    hcp = HCP(
        first_name=first_name,
        last_name=last_name,
        specialty=payload.get("specialty"),
        phone=payload.get("phone"),
        email=payload.get("email"),
        clinic_address=payload.get("clinic_address"),
        area=payload.get("area"),
        city=payload.get("city"),
    )
    db.add(hcp)
    db.commit()
    db.refresh(hcp)
    return _serialize_hcp(hcp)


@router.put(
    "/{hcp_id}",
    response_model=dict,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def update_hcp(
    hcp_id: int,
    payload: dict,
    db: Session = Depends(get_db),
):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HCP not found.")

    if "name" in payload and payload.get("name"):
        parts = str(payload["name"]).strip().split()
        hcp.first_name = parts[0]
        hcp.last_name = " ".join(parts[1:]) if len(parts) > 1 else "-"
    for key in ("specialty", "phone", "email", "clinic_address", "area", "city"):
        if key in payload:
            setattr(hcp, key, payload.get(key))

    db.commit()
    db.refresh(hcp)
    return _serialize_hcp(hcp)


@router.delete(
    "/{hcp_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def delete_hcp(hcp_id: int, db: Session = Depends(get_db)):
    hcp = db.query(HCP).filter(HCP.id == hcp_id).first()
    if not hcp or not hcp.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="HCP not found.")
    hcp.is_active = False
    db.commit()
