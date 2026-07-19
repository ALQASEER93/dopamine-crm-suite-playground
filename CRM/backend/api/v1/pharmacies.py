from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, has_any_role, require_roles
from models.crm import Pharmacy, Route, RouteAccount, User
from schemas.common import PaginatedResponse
from schemas.crm import PharmacyFieldCreate, PharmacyFieldOut, PharmacyFieldUpdate

router = APIRouter(
    prefix="/pharmacies",
    tags=["pharmacies"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/", response_model=PaginatedResponse[PharmacyFieldOut])
def list_pharmacies(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    area: str | None = None,
    city: str | None = None,
    segment: str | None = None,
    search: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PaginatedResponse[PharmacyFieldOut]:
    query = db.query(Pharmacy)
    if has_any_role(current_user, ["medical_rep"]):
        query = (
            query.join(RouteAccount, RouteAccount.pharmacy_id == Pharmacy.id)
            .join(Route, Route.id == RouteAccount.route_id)
            .filter(
                Route.rep_id == current_user.id,
                RouteAccount.account_type == "pharmacy",
            )
            .distinct()
        )
    if area:
        query = query.filter(Pharmacy.area.ilike(f"%{area}%"))
    if city:
        query = query.filter(Pharmacy.city.ilike(f"%{city}%"))
    if segment:
        query = query.filter(Pharmacy.segment.ilike(f"%{segment}%"))
    if search:
        lowered = f"%{search.lower()}%"
        query = query.filter(func.lower(Pharmacy.name).like(lowered))

    page_size = clamp_page_size(page_size)
    pharmacies, total = paginate(query.order_by(Pharmacy.name.asc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=pharmacies,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=PharmacyFieldOut,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def create_pharmacy(payload: PharmacyFieldCreate, db: Session = Depends(get_db)) -> Pharmacy:
    pharmacy = Pharmacy(**payload.model_dump())
    db.add(pharmacy)
    db.commit()
    db.refresh(pharmacy)
    return pharmacy


@router.get("/{pharmacy_id}", response_model=PharmacyFieldOut)
def get_pharmacy(
    pharmacy_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Pharmacy:
    pharmacy = db.get(Pharmacy, pharmacy_id)
    if not pharmacy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pharmacy not found.")
    if has_any_role(current_user, ["medical_rep"]):
        assigned = (
            db.query(RouteAccount.id)
            .join(Route, Route.id == RouteAccount.route_id)
            .filter(
                Route.rep_id == current_user.id,
                RouteAccount.account_type == "pharmacy",
                RouteAccount.pharmacy_id == pharmacy_id,
            )
            .first()
        )
        if not assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
    return pharmacy


@router.put(
    "/{pharmacy_id}",
    response_model=PharmacyFieldOut,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def update_pharmacy(
    pharmacy_id: int, payload: PharmacyFieldUpdate, db: Session = Depends(get_db)
) -> Pharmacy:
    pharmacy = db.get(Pharmacy, pharmacy_id)
    if not pharmacy:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pharmacy not found.")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(pharmacy, key, value)
    db.commit()
    db.refresh(pharmacy)
    return pharmacy
