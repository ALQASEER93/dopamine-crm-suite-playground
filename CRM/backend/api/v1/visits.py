from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload

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
    query = db.query(Visit).filter(Visit.is_deleted.is_(False))

    if has_any_role(current_user, ["medical_rep"]):
        rep_id = current_user.id

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
    db.refresh(visit)
    return visit


@router.get("/summary")
def visits_summary(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    query = db.query(Visit).filter(Visit.is_deleted.is_(False))
    if has_any_role(current_user, ["medical_rep"]):
        query = query.filter(Visit.rep_id == current_user.id)

    total_visits = query.count()
    # Status is not modeled yet; treat all existing records as completed for now.
    data = {
        "totalVisits": total_visits,
        "completedVisits": total_visits,
        "scheduledVisits": 0,
        "cancelledVisits": 0,
    }
    return {"data": data}


def _serialize_dashboard_visit(visit: Visit) -> dict:
    rep = None
    if visit.rep:
        rep = {"id": visit.rep.id, "name": visit.rep.name or visit.rep.email}

    hcp = None
    account = None
    if visit.doctor:
        hcp = {"id": visit.doctor.id, "name": visit.doctor.name, "type": "doctor"}
        account = {"type": "doctor", "id": visit.doctor.id, "name": visit.doctor.name}
    elif visit.pharmacy:
        hcp = {"id": visit.pharmacy.id, "name": visit.pharmacy.name, "type": "pharmacy"}
        account = {"type": "pharmacy", "id": visit.pharmacy.id, "name": visit.pharmacy.name}

    return {
        "id": visit.id,
        "visitDate": visit.visit_date.isoformat(),
        "rep": rep,
        "hcp": hcp,
        "account": account,
        "status": "completed",
        "durationMinutes": 0,
        "notes": visit.notes,
        "samplesGiven": visit.samples_given,
        "nextAction": visit.next_action,
        "nextActionDate": visit.next_action_date.isoformat() if visit.next_action_date else None,
    }


@router.get("/latest")
def latest_visits(
    page_size: int = Query(5, alias="pageSize", ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    page_size = clamp_page_size(page_size)
    query = (
        db.query(Visit)
        .options(joinedload(Visit.rep), joinedload(Visit.doctor), joinedload(Visit.pharmacy))
        .filter(Visit.is_deleted.is_(False))
        .order_by(Visit.visit_date.desc(), Visit.id.desc())
    )

    if has_any_role(current_user, ["medical_rep"]):
        query = query.filter(Visit.rep_id == current_user.id)

    visits = query.limit(page_size).all()
    data = [_serialize_dashboard_visit(visit) for visit in visits]
    return {"data": data}


def _get_visit(db: Session, visit_id: int) -> Visit:
    visit = db.query(Visit).filter(Visit.id == visit_id, Visit.is_deleted.is_(False)).first()
    if not visit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Visit not found.")
    return visit


@router.get("/{visit_id}", response_model=VisitOut)
def get_visit(visit_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Visit:
    visit = _get_visit(db, visit_id)
    if has_any_role(current_user, ["medical_rep"]) and visit.rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")
    return visit


@router.put(
    "/{visit_id}",
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
    "/{visit_id}",
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
