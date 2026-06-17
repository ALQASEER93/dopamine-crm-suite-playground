from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session, joinedload

from api.v1.utils import DEFAULT_PAGE, DEFAULT_PAGE_SIZE, clamp_page_size, paginate
from core.db import get_db
from core.security import get_current_user, require_roles
from models.crm import EventAttendee, KOL, MedicalEvent, ScientificMaterial, User
from schemas.common import PaginatedResponse
from schemas.crm import (
    EventAttendeeCreate,
    EventAttendeeOut,
    EventAttendeeUpdate,
    KOLEngagementOut,
    KOLCreate,
    KOLOut,
    KOLUpdate,
    MedicalEventCreate,
    MedicalEventOut,
    MedicalEventEngagementOut,
    MedicalEventUpdate,
    ScientificMaterialCreate,
    ScientificMaterialOut,
    ScientificMaterialUpdate,
)

router = APIRouter(
    prefix="/medical-affairs",
    tags=["medical_affairs"],
    dependencies=[Depends(get_current_user)],
)


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid datetime format.") from exc


@router.get(
    "/events",
    response_model=PaginatedResponse[MedicalEventOut],
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def list_medical_events(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    q: str | None = None,
    status_filter: str | None = Query(default=None, alias="status"),
    from_date: str | None = None,
    to_date: str | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[MedicalEventOut]:
    page_size = clamp_page_size(page_size)
    from_dt = _parse_iso_datetime(from_date)
    to_dt = _parse_iso_datetime(to_date)
    query = db.query(MedicalEvent).options(joinedload(MedicalEvent.attendees).joinedload(EventAttendee.kol))
    if q:
        query = query.filter(MedicalEvent.title.ilike(f"%{q.strip()}%"))
    if status_filter:
        query = query.filter(MedicalEvent.status == status_filter)
    if from_dt:
        query = query.filter(MedicalEvent.starts_at >= from_dt)
    if to_dt:
        query = query.filter(MedicalEvent.ends_at <= to_dt)

    rows, total = paginate(query.order_by(MedicalEvent.starts_at.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=rows,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/events",
    response_model=MedicalEventOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def create_medical_event(
    payload: MedicalEventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MedicalEvent:
    if payload.ends_at <= payload.starts_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ends_at must be after starts_at.")
    event = MedicalEvent(**payload.model_dump(), created_by_id=current_user.id)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get(
    "/events/{event_id}",
    response_model=MedicalEventOut,
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def get_medical_event(
    event_id: int,
    db: Session = Depends(get_db),
) -> MedicalEvent:
    event = (
        db.query(MedicalEvent)
        .options(
            joinedload(MedicalEvent.attendees).joinedload(EventAttendee.kol),
            joinedload(MedicalEvent.attendees).joinedload(EventAttendee.doctor),
        )
        .filter(MedicalEvent.id == event_id)
        .first()
    )
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    return event


@router.patch(
    "/events/{event_id}",
    response_model=MedicalEventOut,
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def update_medical_event(
    event_id: int,
    payload: MedicalEventUpdate,
    db: Session = Depends(get_db),
) -> MedicalEvent:
    event = db.get(MedicalEvent, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    updates = payload.model_dump(exclude_unset=True)
    starts_at = updates.get("starts_at", event.starts_at)
    ends_at = updates.get("ends_at", event.ends_at)
    if starts_at and ends_at and ends_at <= starts_at:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="ends_at must be after starts_at.")
    for key, value in updates.items():
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return event


@router.post(
    "/events/{event_id}/attendees",
    response_model=EventAttendeeOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def add_event_attendee(
    event_id: int,
    payload: EventAttendeeCreate,
    db: Session = Depends(get_db),
) -> EventAttendee:
    event = db.get(MedicalEvent, event_id)
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    if payload.kol_id and not db.get(KOL, payload.kol_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KOL not found.")

    attendee = EventAttendee(event_id=event_id, **payload.model_dump())
    db.add(attendee)
    try:
        db.commit()
    except Exception as exc:  # noqa: BLE001
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Attendee already exists.") from exc
    db.refresh(attendee)
    return attendee


@router.get(
    "/events/{event_id}/attendees",
    response_model=list[EventAttendeeOut],
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def list_event_attendees(
    event_id: int,
    db: Session = Depends(get_db),
) -> list[EventAttendee]:
    if not db.get(MedicalEvent, event_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")
    rows = (
        db.query(EventAttendee)
        .options(joinedload(EventAttendee.kol), joinedload(EventAttendee.doctor))
        .filter(EventAttendee.event_id == event_id)
        .order_by(EventAttendee.id.asc())
        .all()
    )
    return rows


@router.patch(
    "/events/{event_id}/attendees/{attendee_id}",
    response_model=EventAttendeeOut,
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def update_event_attendee(
    event_id: int,
    attendee_id: int,
    payload: EventAttendeeUpdate,
    db: Session = Depends(get_db),
) -> EventAttendee:
    attendee = db.get(EventAttendee, attendee_id)
    if not attendee or attendee.event_id != event_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attendee not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(attendee, key, value)
    db.commit()
    db.refresh(attendee)
    return attendee


@router.get(
    "/kols",
    response_model=PaginatedResponse[KOLOut],
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def list_kols(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    q: str | None = None,
    city: str | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[KOLOut]:
    page_size = clamp_page_size(page_size)
    query = db.query(KOL)
    if q:
        q_text = q.strip()
        query = query.filter(
            (KOL.name.ilike(f"%{q_text}%"))
            | (KOL.specialty.ilike(f"%{q_text}%"))
            | (KOL.institution.ilike(f"%{q_text}%"))
        )
    if city:
        query = query.filter(KOL.city == city)
    rows, total = paginate(query.order_by(KOL.name.asc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=rows,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/kols",
    response_model=KOLOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def create_kol(payload: KOLCreate, db: Session = Depends(get_db)) -> KOL:
    kol = KOL(**payload.model_dump())
    db.add(kol)
    db.commit()
    db.refresh(kol)
    return kol


@router.patch(
    "/kols/{kol_id}",
    response_model=KOLOut,
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def update_kol(
    kol_id: int,
    payload: KOLUpdate,
    db: Session = Depends(get_db),
) -> KOL:
    kol = db.get(KOL, kol_id)
    if not kol:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KOL not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(kol, key, value)
    db.commit()
    db.refresh(kol)
    return kol


@router.get(
    "/materials",
    response_model=PaginatedResponse[ScientificMaterialOut],
    dependencies=[Depends(require_roles("admin", "sales_manager", "medical_rep"))],
)
def list_scientific_materials(
    page: int = Query(DEFAULT_PAGE, ge=1),
    page_size: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=500),
    q: str | None = None,
    material_type: str | None = None,
    therapeutic_area: str | None = None,
    db: Session = Depends(get_db),
) -> PaginatedResponse[ScientificMaterialOut]:
    page_size = clamp_page_size(page_size)
    query = db.query(ScientificMaterial)
    if q:
        query = query.filter(ScientificMaterial.title.ilike(f"%{q.strip()}%"))
    if material_type:
        query = query.filter(ScientificMaterial.material_type == material_type)
    if therapeutic_area:
        query = query.filter(ScientificMaterial.therapeutic_area == therapeutic_area)
    rows, total = paginate(query.order_by(ScientificMaterial.created_at.desc()), page, page_size)
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=rows,
        pagination={"page": page, "page_size": page_size, "total": total, "total_pages": total_pages},
    )


@router.post(
    "/materials",
    response_model=ScientificMaterialOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def create_scientific_material(
    payload: ScientificMaterialCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ScientificMaterial:
    material = ScientificMaterial(**payload.model_dump(), created_by_id=current_user.id)
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


@router.patch(
    "/materials/{material_id}",
    response_model=ScientificMaterialOut,
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def update_scientific_material(
    material_id: int,
    payload: ScientificMaterialUpdate,
    db: Session = Depends(get_db),
) -> ScientificMaterial:
    material = db.get(ScientificMaterial, material_id)
    if not material:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Material not found.")
    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(material, key, value)
    db.commit()
    db.refresh(material)
    return material


@router.get(
    "/reports/event-engagement",
    response_model=list[MedicalEventEngagementOut],
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def report_event_engagement(
    from_date: str | None = None,
    to_date: str | None = None,
    db: Session = Depends(get_db),
) -> list[MedicalEventEngagementOut]:
    from_dt = _parse_iso_datetime(from_date)
    to_dt = _parse_iso_datetime(to_date)
    query = db.query(MedicalEvent).options(joinedload(MedicalEvent.attendees))
    if from_dt:
        query = query.filter(MedicalEvent.starts_at >= from_dt)
    if to_dt:
        query = query.filter(MedicalEvent.ends_at <= to_dt)
    events = query.order_by(MedicalEvent.starts_at.desc()).all()

    rows: list[MedicalEventEngagementOut] = []
    for event in events:
        rows.append(
            MedicalEventEngagementOut(
                event_id=event.id,
                title=event.title,
                starts_at=event.starts_at,
                attendees_count=len(event.attendees),
            )
        )
    return rows


@router.get(
    "/reports/kol-engagement",
    response_model=list[KOLEngagementOut],
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
def report_kol_engagement(db: Session = Depends(get_db)) -> list[KOLEngagementOut]:
    rows = (
        db.query(
            KOL.id.label("kol_id"),
            KOL.name.label("kol_name"),
            func.count(EventAttendee.id).label("events_count"),
            func.sum(case((EventAttendee.attended.is_(True), 1), else_=0)).label("attended_count"),
            func.avg(EventAttendee.feedback_score).label("avg_feedback_score"),
        )
        .join(EventAttendee, EventAttendee.kol_id == KOL.id, isouter=True)
        .group_by(KOL.id, KOL.name)
        .order_by(KOL.name.asc())
        .all()
    )
    result: list[KOLEngagementOut] = []
    for row in rows:
        result.append(
            KOLEngagementOut(
                kol_id=int(row.kol_id),
                kol_name=row.kol_name,
                events_count=int(row.events_count or 0),
                attended_count=int(row.attended_count or 0),
                avg_feedback_score=(round(float(row.avg_feedback_score), 2) if row.avg_feedback_score is not None else None),
            )
        )
    return result
