from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Role, Route, RouteAccount, User
from schemas.common import PaginatedResponse
from schemas.crm import RouteCreate, RouteOut, RouteStopOut
from schemas.user import RepCreate, RepUpdate, UserOut
from services.auth import hash_password

router = APIRouter(
    prefix="",
    tags=["reps"],
    dependencies=[Depends(get_current_user)],
)


def _rep_query(db: Session):
    return db.query(User).join(User.role).filter(User.role.has(slug="medical_rep"))


def _get_role(db: Session, *, role_slug: Optional[str], role_id: Optional[int]) -> Role:
    if role_id:
        role = db.get(Role, role_id)
        if not role:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found.")
        return role
    slug = role_slug or "medical_rep"
    role = db.query(Role).filter(Role.slug == slug).first()
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role not found.")
    return role


def _get_rep_or_404(db: Session, rep_id: int) -> User:
    rep = _rep_query(db).filter(User.id == rep_id).first()
    if not rep:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Rep not found.")
    return rep


def _format_address(*parts: Optional[str]) -> Optional[str]:
    cleaned = [part.strip() for part in parts if part and part.strip()]
    return ", ".join(cleaned) if cleaned else None


@router.get("/reps", response_model=list[UserOut])
def list_reps(
    name: Optional[str] = None,
    email: Optional[str] = None,
    route_id: Optional[int] = None,
    include_inactive: bool = False,
    db: Session = Depends(get_db),
) -> list[User]:
    query = _rep_query(db)
    if not include_inactive:
        query = query.filter(User.is_active.is_(True))
    if name:
        lowered = f"%{name.lower()}%"
        query = query.filter(func.lower(User.name).like(lowered))
    if email:
        lowered = f"%{email.lower()}%"
        query = query.filter(func.lower(User.email).like(lowered))
    if route_id:
        query = query.join(Route, Route.rep_id == User.id).filter(Route.id == route_id)
    return query.order_by(User.name.asc()).all()


@router.get("/reps/{rep_id}", response_model=UserOut)
def get_rep(rep_id: int, db: Session = Depends(get_db)) -> User:
    return _get_rep_or_404(db, rep_id)


@router.post(
    "/reps",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def create_rep(payload: RepCreate, db: Session = Depends(get_db)) -> User:
    existing = db.query(User).filter(func.lower(User.email) == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")
    role = _get_role(db, role_slug=payload.role_slug, role_id=payload.role_id)
    rep = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        is_active=payload.is_active,
        role_id=role.id,
    )
    db.add(rep)
    db.commit()
    db.refresh(rep)
    return rep


@router.put(
    "/reps/{rep_id}",
    response_model=UserOut,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def update_rep(rep_id: int, payload: RepUpdate, db: Session = Depends(get_db)) -> User:
    rep = _get_rep_or_404(db, rep_id)
    updates = payload.model_dump(exclude_unset=True)

    if "email" in updates:
        new_email = updates["email"].lower()
        existing = db.query(User).filter(func.lower(User.email) == new_email, User.id != rep_id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already in use.")
        rep.email = new_email

    if "name" in updates and updates["name"] is not None:
        rep.name = updates["name"]
    if "is_active" in updates and updates["is_active"] is not None:
        rep.is_active = updates["is_active"]
    if "password" in updates and updates["password"]:
        rep.password_hash = hash_password(updates["password"])

    if updates.get("role_id") is not None or updates.get("role_slug") is not None:
        role = _get_role(
            db,
            role_slug=updates.get("role_slug"),
            role_id=updates.get("role_id"),
        )
        rep.role_id = role.id

    db.commit()
    db.refresh(rep)
    return rep


@router.delete(
    "/reps/{rep_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def deactivate_rep(rep_id: int, db: Session = Depends(get_db)) -> Response:
    rep = _get_rep_or_404(db, rep_id)
    rep.is_active = False
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


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


@router.get("/routes/today", response_model=list[RouteStopOut])
def get_today_route(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[RouteStopOut]:
    query = (
        db.query(Route)
        .options(
            joinedload(Route.accounts).joinedload(RouteAccount.doctor),
            joinedload(Route.accounts).joinedload(RouteAccount.pharmacy),
        )
        .filter(Route.rep_id == current_user.id)
        .order_by(Route.id.asc())
    )
    route = query.first()
    if not route:
        return []

    stops: list[RouteStopOut] = []
    for account in route.accounts:
        if account.account_type == "doctor" and account.doctor:
            customer = account.doctor
            address = _format_address(customer.clinic, customer.area, customer.city)
        elif account.account_type == "pharmacy" and account.pharmacy:
            customer = account.pharmacy
            address = _format_address(customer.area, customer.city)
        else:
            continue

        stops.append(
            RouteStopOut(
                id=account.id,
                customer_id=customer.id,
                customer_name=customer.name,
                customer_type=account.account_type,
                address=address,
                status="planned",
                scheduled_for=None,
                location=None,
            )
        )

    return stops


@router.get("/routes/{route_id}", response_model=RouteOut)
def get_route(route_id: int, db: Session = Depends(get_db)) -> Route:
    route = db.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found.")
    return route
