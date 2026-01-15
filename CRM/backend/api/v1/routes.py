from __future__ import annotations

import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Doctor, Pharmacy, Route, RouteAccount, User, Visit
from schemas.common import PaginatedResponse
from schemas.crm import RouteCreate, RouteOut, RouteUpdate

router = APIRouter(
    prefix="/routes",
    tags=["routes"],
    dependencies=[Depends(get_current_user)],
)

STATUS_MAP = {
    "SCHEDULED": "planned",
    "IN_PROGRESS": "in-progress",
    "COMPLETED": "done",
    "CANCELED": "skipped",
    "NO_SHOW": "skipped",
}


def _validate_accounts(db: Session, accounts: list[RouteAccount]) -> None:
    for account in accounts:
        if account.account_type == "doctor":
            if not account.doctor_id or not db.get(Doctor, account.doctor_id):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor not found.")
        if account.account_type == "pharmacy":
            if not account.pharmacy_id or not db.get(Pharmacy, account.pharmacy_id):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Pharmacy not found.")


@router.get("/", response_model=PaginatedResponse[RouteOut])
def list_routes(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    rep_id: int | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[RouteOut]:
    query = db.query(Route).options(joinedload(Route.accounts))
    if rep_id:
        query = query.filter(Route.rep_id == rep_id)

    page_size = clamp_page_size(page_size)
    routes, total = paginate(query.order_by(Route.name.asc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=routes,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.get("/today")
def today_route(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[dict]:
    visits = (
        db.query(Visit)
        .options(joinedload(Visit.doctor), joinedload(Visit.pharmacy))
        .filter(
            Visit.rep_id == current_user.id,
            Visit.is_deleted.is_(False),
            Visit.visit_date == date.today(),
        )
        .order_by(Visit.planned_at.asc().nullslast(), Visit.id.asc())
        .all()
    )
    results: list[dict] = []
    for visit in visits:
        customer_type = "doctor" if visit.doctor_id else "pharmacy"
        customer_id = visit.doctor_id or visit.pharmacy_id
        customer_name = visit.doctor.name if visit.doctor else (visit.pharmacy.name if visit.pharmacy else "")
        results.append(
            {
                "id": str(visit.id),
                "customerId": str(customer_id) if customer_id else "",
                "customerName": customer_name,
                "customerType": customer_type,
                "address": None,
                "status": STATUS_MAP.get(visit.status, "planned"),
                "scheduledFor": visit.planned_at.isoformat() if visit.planned_at else None,
                "location": None,
            }
        )
    return results


@router.post(
    "/",
    response_model=RouteOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def create_route(payload: RouteCreate, db: Session = Depends(get_db)) -> Route:
    if not db.get(User, payload.rep_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rep not found.")

    route = Route(
        name=payload.name,
        rep_id=payload.rep_id,
        frequency=payload.frequency,
        notes=payload.notes,
    )
    db.add(route)
    db.flush()

    accounts = []
    for account in payload.accounts:
        route_account = RouteAccount(
            route_id=route.id,
            account_type=account.account_type,
            doctor_id=account.doctor_id,
            pharmacy_id=account.pharmacy_id,
            visit_frequency=account.visit_frequency,
        )
        accounts.append(route_account)
        db.add(route_account)

    _validate_accounts(db, accounts)
    db.commit()
    db.refresh(route)
    return route


@router.get("/{route_id:int}", response_model=RouteOut)
def get_route(route_id: int, db: Session = Depends(get_db)) -> Route:
    route = (
        db.query(Route)
        .options(joinedload(Route.accounts))
        .filter(Route.id == route_id)
        .first()
    )
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found.")
    return route


@router.put(
    "/{route_id:int}",
    response_model=RouteOut,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def update_route(route_id: int, payload: RouteUpdate, db: Session = Depends(get_db)) -> Route:
    route = db.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found.")

    updates = payload.model_dump(exclude_unset=True)
    accounts_payload = updates.pop("accounts", None)
    if updates.get("rep_id") and not db.get(User, updates["rep_id"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Rep not found.")

    for key, value in updates.items():
        setattr(route, key, value)

    if accounts_payload is not None:
        db.query(RouteAccount).filter(RouteAccount.route_id == route.id).delete()
        accounts = []
        for account in accounts_payload:
            account_data = account if isinstance(account, dict) else account.model_dump()
            route_account = RouteAccount(
                route_id=route.id,
                account_type=account_data.get("account_type"),
                doctor_id=account_data.get("doctor_id"),
                pharmacy_id=account_data.get("pharmacy_id"),
                visit_frequency=account_data.get("visit_frequency"),
            )
            accounts.append(route_account)
            db.add(route_account)
        _validate_accounts(db, accounts)

    db.commit()
    db.refresh(route)
    return route


@router.delete(
    "/{route_id:int}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
)
def delete_route(route_id: int, db: Session = Depends(get_db)) -> Response:
    route = db.get(Route, route_id)
    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found.")
    db.query(RouteAccount).filter(RouteAccount.route_id == route_id).delete()
    db.delete(route)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/export", dependencies=[Depends(require_roles("sales_manager", "admin"))])
def export_routes(rep_id: int | None = None, db: Session = Depends(get_db)) -> Response:
    query = db.query(Route).options(joinedload(Route.accounts))
    if rep_id:
        query = query.filter(Route.rep_id == rep_id)

    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "id",
            "name",
            "rep_id",
            "frequency",
            "notes",
            "accounts_count",
        ],
    )
    writer.writeheader()
    for route in query.order_by(Route.name.asc()).all():
        writer.writerow(
            {
                "id": route.id,
                "name": route.name,
                "rep_id": route.rep_id,
                "frequency": route.frequency or "",
                "notes": route.notes or "",
                "accounts_count": len(route.accounts or []),
            }
        )

    headers = {"Content-Disposition": 'attachment; filename="routes.csv"'}
    return Response(content=buffer.getvalue(), media_type="text/csv", headers=headers)
