from __future__ import annotations

import csv
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import Product, RepProfile, Territory, User, Visit

router = APIRouter(
    prefix="/reports",
    tags=["reports"],
    dependencies=[Depends(get_current_user), Depends(require_roles("sales_manager", "admin"))],
)


def _parse_date(value: Optional[str]) -> Optional[date]:
    if not value:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid date format.") from exc


def _visit_query(db: Session, date_from: Optional[date], date_to: Optional[date]):
    query = db.query(Visit).filter(Visit.is_deleted.is_(False))
    if date_from:
        query = query.filter(Visit.visit_date >= date_from)
    if date_to:
        query = query.filter(Visit.visit_date <= date_to)
    return query


@router.get("/overview")
def reports_overview(
    from_date: Optional[str] = Query(default=None, alias="from"),
    to_date: Optional[str] = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> dict:
    date_from = _parse_date(from_date)
    date_to = _parse_date(to_date)

    visit_query = _visit_query(db, date_from, date_to)
    total_visits = visit_query.count()
    successful_visits = visit_query.filter(Visit.status == "completed").count()

    return {
        "data": {
            "totalVisits": total_visits,
            "successfulVisits": successful_visits,
            "scheduledVisits": visit_query.filter(Visit.status == "scheduled").count(),
            "cancelledVisits": visit_query.filter(Visit.status == "cancelled").count(),
        }
    }


@router.get("/rep-performance")
def rep_performance(
    from_date: Optional[str] = Query(default=None, alias="from"),
    to_date: Optional[str] = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> list[dict]:
    date_from = _parse_date(from_date)
    date_to = _parse_date(to_date)
    visits = _visit_query(db, date_from, date_to).all()

    reps = {rep.id: rep for rep in db.query(User).all()}
    profiles = {
        profile.user_id: profile
        for profile in db.query(RepProfile).join(User).all()
    }
    territories = {t.id: t for t in db.query(Territory).all()}

    metrics = {}
    for visit in visits:
        rep_id = visit.rep_id
        if rep_id not in metrics:
            metrics[rep_id] = {
                "repId": rep_id,
                "totalVisits": 0,
                "completedVisits": 0,
                "scheduledVisits": 0,
                "cancelledVisits": 0,
                "uniqueAccounts": set(),
                "hcpVisits": 0,
                "pharmacyVisits": 0,
            }
        entry = metrics[rep_id]
        entry["totalVisits"] += 1
        if visit.status == "completed":
            entry["completedVisits"] += 1
        if visit.status == "scheduled":
            entry["scheduledVisits"] += 1
        if visit.status == "cancelled":
            entry["cancelledVisits"] += 1
        if visit.doctor_id:
            entry["uniqueAccounts"].add(f"doctor:{visit.doctor_id}")
            entry["hcpVisits"] += 1
        if visit.pharmacy_id:
            entry["uniqueAccounts"].add(f"pharmacy:{visit.pharmacy_id}")
            entry["pharmacyVisits"] += 1

    results = []
    for rep_id, entry in metrics.items():
        rep = reps.get(rep_id)
        profile = profiles.get(rep_id)
        territory_names = []
        if profile and profile.territory_id:
            territory = territories.get(profile.territory_id)
            if territory:
                territory_names.append(territory.name)
        results.append(
            {
                "repId": rep_id,
                "repName": rep.name if rep else None,
                "repEmail": rep.email if rep else None,
                "territoryNames": territory_names,
                "totalVisits": entry["totalVisits"],
                "completedVisits": entry["completedVisits"],
                "scheduledVisits": entry["scheduledVisits"],
                "cancelledVisits": entry["cancelledVisits"],
                "uniqueAccounts": len(entry["uniqueAccounts"]),
                "hcpVisits": entry["hcpVisits"],
                "pharmacyVisits": entry["pharmacyVisits"],
                "avgRating": None,
            }
        )

    return results


@router.get(
    "/rep-performance/export",
    dependencies=[Depends(require_roles("sales_manager", "admin"))],
    response_class=Response,
)
def rep_performance_export(
    from_date: Optional[str] = Query(default=None, alias="from"),
    to_date: Optional[str] = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> Response:
    rows = rep_performance(from_date=from_date, to_date=to_date, db=db)
    buffer = io.StringIO()
    writer = csv.DictWriter(
        buffer,
        fieldnames=[
            "repId",
            "repName",
            "repEmail",
            "territoryNames",
            "totalVisits",
            "completedVisits",
            "scheduledVisits",
            "cancelledVisits",
            "uniqueAccounts",
            "avgRating",
        ],
        extrasaction="ignore",
    )
    writer.writeheader()
    for row in rows:
        writer.writerow(
            {
                **row,
                "territoryNames": ", ".join(row.get("territoryNames") or []),
            }
        )
    csv_data = buffer.getvalue()
    headers = {"Content-Disposition": 'attachment; filename="rep-performance.csv"'}
    return Response(content=csv_data, media_type="text/csv", headers=headers)


@router.get("/product-performance")
def product_performance(
    from_date: Optional[str] = Query(default=None, alias="from"),
    to_date: Optional[str] = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> list[dict]:
    date_from = _parse_date(from_date)
    date_to = _parse_date(to_date)

    results = []
    for product in db.query(Product).order_by(Product.name.asc()).all():
        results.append(
            {
                "productName": product.name,
                "productLine": product.line,
                "visitsCount": None,
                "sampleRequestCount": None,
            }
        )

    return results


@router.get("/territory-performance")
def territory_performance(
    from_date: Optional[str] = Query(default=None, alias="from"),
    to_date: Optional[str] = Query(default=None, alias="to"),
    db: Session = Depends(get_db),
) -> list[dict]:
    date_from = _parse_date(from_date)
    date_to = _parse_date(to_date)
    visits = _visit_query(db, date_from, date_to).all()

    profiles = {
        profile.user_id: profile
        for profile in db.query(RepProfile).all()
    }
    territories = {t.id: t for t in db.query(Territory).all()}

    metrics = {}
    for visit in visits:
        profile = profiles.get(visit.rep_id)
        if not profile or not profile.territory_id:
            continue
        territory_id = profile.territory_id
        if territory_id not in metrics:
            metrics[territory_id] = {
                "territoryId": territory_id,
                "totalVisits": 0,
                "completedVisits": 0,
                "uniqueAccounts": set(),
            }
        entry = metrics[territory_id]
        entry["totalVisits"] += 1
        if visit.status == "completed":
            entry["completedVisits"] += 1
        if visit.doctor_id:
            entry["uniqueAccounts"].add(f"doctor:{visit.doctor_id}")
        if visit.pharmacy_id:
            entry["uniqueAccounts"].add(f"pharmacy:{visit.pharmacy_id}")

    results = []
    for territory_id, entry in metrics.items():
        territory = territories.get(territory_id)
        results.append(
            {
                "territoryId": territory_id,
                "territoryName": territory.name if territory else None,
                "totalVisits": entry["totalVisits"],
                "completedVisits": entry["completedVisits"],
                "uniqueAccounts": len(entry["uniqueAccounts"]),
                "avgRating": None,
            }
        )
    return results
