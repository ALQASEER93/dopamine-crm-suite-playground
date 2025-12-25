from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Collection, Doctor, Pharmacy
from schemas.common import PaginatedResponse
from schemas.crm import CollectionCreate, CollectionOut

router = APIRouter(
    prefix="/collections",
    tags=["collections"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[CollectionOut])
def list_collections(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    date_from: date | None = None,
    date_to: date | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[CollectionOut]:
    from core.security import has_any_role
    from models.crm import Visit
    
    query = db.query(Collection)
    # Rep-scoped filtering: medical_rep can only see collections linked to their visits
    if has_any_role(current_user, ["medical_rep"]):
        rep_visits = db.query(Visit).filter(Visit.rep_id == current_user.id).all()
        rep_doctor_ids = {v.doctor_id for v in rep_visits if v.doctor_id}
        rep_pharmacy_ids = {v.pharmacy_id for v in rep_visits if v.pharmacy_id}
        if rep_doctor_ids or rep_pharmacy_ids:
            from sqlalchemy import or_
            conditions = []
            if rep_doctor_ids:
                conditions.append(Collection.doctor_id.in_(list(rep_doctor_ids)))
            if rep_pharmacy_ids:
                conditions.append(Collection.pharmacy_id.in_(list(rep_pharmacy_ids)))
            if conditions:
                query = query.filter(or_(*conditions))
        else:
            # No visits = no collections to show
            query = query.filter(Collection.id == -1)  # Empty result set
    if date_from:
        query = query.filter(Collection.collection_date >= date_from)
    if date_to:
        query = query.filter(Collection.collection_date <= date_to)

    page_size = clamp_page_size(page_size)
    items, total = paginate(query.order_by(Collection.collection_date.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=items,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/",
    response_model=CollectionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "admin", "accountant"))],
)
def create_collection(payload: CollectionCreate, db: Session = Depends(get_db)) -> Collection:
    if payload.doctor_id and not db.get(Doctor, payload.doctor_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found.")
    if payload.pharmacy_id and not db.get(Pharmacy, payload.pharmacy_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pharmacy not found.")
    collection = Collection(**payload.model_dump())
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return collection
