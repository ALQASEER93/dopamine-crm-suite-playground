from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Route, RouteAccount, User
from schemas.common import PaginatedResponse
from schemas.crm import RouteCreate, RouteOut
from schemas.user import UserOut

router = APIRouter(
    tags=["reps"],
    dependencies=[Depends(get_current_user)],
)


@router.get("/reps", response_model=list[UserOut])
def list_reps(db: Session = Depends(get_db)) -> list[User]:
    reps = (
        db.query(User)
        .join(User.role)
        .filter(User.is_active.is_(True), User.role.has(slug="medical_rep"))
        .all()
    )
    return reps


@router.get("/routes", response_model=PaginatedResponse[RouteOut])
def list_routes(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    rep_id: int | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[RouteOut]:
    query = db.query(Route)
    if rep_id:
        query = query.filter(Route.rep_id == rep_id)

    page_size = clamp_page_size(page_size)
    routes, total = paginate(query.order_by(Route.name.asc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=routes,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/routes",
    response_model=RouteOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def create_route(payload: RouteCreate, db: Session = Depends(get_db)) -> Route:
    route = Route(
        name=payload.name,
        rep_id=payload.rep_id,
        frequency=payload.frequency,
        notes=payload.notes,
    )
    db.add(route)
    db.flush()
    for account in payload.accounts:
        db.add(
            RouteAccount(
                route_id=route.id,
                account_type=account.account_type,
                doctor_id=account.doctor_id,
                pharmacy_id=account.pharmacy_id,
                visit_frequency=account.visit_frequency,
            )
        )
    db.commit()
    db.refresh(route)
    return route


@router.get("/routes/{route_id}", response_model=RouteOut)
def get_route(route_id: int, db: Session = Depends(get_db)) -> Route:
    route = db.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found.")
    return route
