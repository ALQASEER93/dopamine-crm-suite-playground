from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from core.db import get_db
from core.security import get_current_user, has_any_role
from models.crm import TelemetryLocation, User
from schemas.telemetry import TelemetryLocationIn, TelemetryLocationOut

router = APIRouter(
    prefix="/telemetry",
    tags=["telemetry"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/location", response_model=TelemetryLocationOut, status_code=status.HTTP_201_CREATED)
def create_location(
    payload: TelemetryLocationIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TelemetryLocationOut:
    ts_value = payload.ts or datetime.now(timezone.utc)
    entry = TelemetryLocation(
        rep_id=current_user.id,
        lat=payload.lat,
        lng=payload.lng,
        accuracy_m=payload.accuracy,
        speed_mps=payload.speed,
        bearing_deg=payload.bearing,
        ts=ts_value,
        device_info=payload.device_info,
        source=payload.source or "native_capacitor",
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return TelemetryLocationOut(
        id=entry.id,
        rep_id=entry.rep_id,
        rep_name=current_user.name,
        lat=entry.lat,
        lng=entry.lng,
        accuracy_m=entry.accuracy_m,
        speed_mps=entry.speed_mps,
        bearing_deg=entry.bearing_deg,
        ts=entry.ts,
        device_info=entry.device_info,
        source=entry.source,
    )


@router.get("/location/latest", response_model=List[TelemetryLocationOut])
def latest_locations(
    rep_id: Optional[int] = Query(default=None),
    limit: int = Query(1, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[TelemetryLocationOut]:
    if rep_id and has_any_role(current_user, ["medical_rep"]) and rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")

    if rep_id:
        rows = (
            db.query(TelemetryLocation, User)
            .join(User, User.id == TelemetryLocation.rep_id)
            .filter(TelemetryLocation.rep_id == rep_id)
            .order_by(TelemetryLocation.ts.desc(), TelemetryLocation.id.desc())
            .limit(limit)
            .all()
        )
        return [
            TelemetryLocationOut(
                id=item.TelemetryLocation.id,
                rep_id=item.TelemetryLocation.rep_id,
                rep_name=item.User.name,
                lat=item.TelemetryLocation.lat,
                lng=item.TelemetryLocation.lng,
                accuracy_m=item.TelemetryLocation.accuracy_m,
                speed_mps=item.TelemetryLocation.speed_mps,
                bearing_deg=item.TelemetryLocation.bearing_deg,
                ts=item.TelemetryLocation.ts,
                device_info=item.TelemetryLocation.device_info,
                source=item.TelemetryLocation.source,
            )
            for item in rows
        ]

    subquery = (
        db.query(
            TelemetryLocation.rep_id,
            func.max(TelemetryLocation.ts).label("max_ts"),
        )
        .group_by(TelemetryLocation.rep_id)
        .subquery()
    )
    rows = (
        db.query(TelemetryLocation, User)
        .join(User, User.id == TelemetryLocation.rep_id)
        .join(
            subquery,
            (TelemetryLocation.rep_id == subquery.c.rep_id)
            & (TelemetryLocation.ts == subquery.c.max_ts),
        )
        .order_by(TelemetryLocation.ts.desc())
        .all()
    )
    return [
        TelemetryLocationOut(
            id=item.TelemetryLocation.id,
            rep_id=item.TelemetryLocation.rep_id,
            rep_name=item.User.name,
            lat=item.TelemetryLocation.lat,
            lng=item.TelemetryLocation.lng,
            accuracy_m=item.TelemetryLocation.accuracy_m,
            speed_mps=item.TelemetryLocation.speed_mps,
            bearing_deg=item.TelemetryLocation.bearing_deg,
            ts=item.TelemetryLocation.ts,
            device_info=item.TelemetryLocation.device_info,
            source=item.TelemetryLocation.source,
        )
        for item in rows
    ]


@router.get("/location/trail", response_model=List[TelemetryLocationOut])
def location_trail(
    rep_id: int = Query(..., ge=1),
    limit: int = Query(50, ge=1, le=500),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[TelemetryLocationOut]:
    if has_any_role(current_user, ["medical_rep"]) and rep_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")

    rows = (
        db.query(TelemetryLocation, User)
        .join(User, User.id == TelemetryLocation.rep_id)
        .filter(TelemetryLocation.rep_id == rep_id)
        .order_by(TelemetryLocation.ts.desc(), TelemetryLocation.id.desc())
        .limit(limit)
        .all()
    )
    return [
        TelemetryLocationOut(
            id=item.TelemetryLocation.id,
            rep_id=item.TelemetryLocation.rep_id,
            rep_name=item.User.name,
            lat=item.TelemetryLocation.lat,
            lng=item.TelemetryLocation.lng,
            accuracy_m=item.TelemetryLocation.accuracy_m,
            speed_mps=item.TelemetryLocation.speed_mps,
            bearing_deg=item.TelemetryLocation.bearing_deg,
            ts=item.TelemetryLocation.ts,
            device_info=item.TelemetryLocation.device_info,
            source=item.TelemetryLocation.source,
        )
        for item in rows
    ]
