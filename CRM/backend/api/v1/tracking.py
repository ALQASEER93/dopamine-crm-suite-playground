from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from core.db import get_db
from core.security import get_current_user, require_roles
from core.config import settings
from models.crm import Device, LocationEvent, User
from schemas.crm import DeviceOut, DeviceRegister, LocationEventBatch, LocationEventIn
from api.v1.utils_gps import haversine_distance_m

router = APIRouter(
    prefix="",
    tags=["tracking"],
    dependencies=[Depends(get_current_user)],
)


@router.post("/devices/register", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
def register_device(
    payload: DeviceRegister,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Device:
    device = Device(
        user_id=current_user.id,
        platform=payload.platform,
        device_label=payload.device_label,
        last_seen_at=datetime.now(timezone.utc),
        is_active=True,
    )
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.delete(
    "/devices/{device_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_roles("admin"))],
)
def delete_device(
    device_id: int,
    db: Session = Depends(get_db),
) -> Response:
    device = db.get(Device, device_id)
    if not device:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Device not found.")
    db.delete(device)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/location-events/batch")
def ingest_location_events(
    payload: LocationEventBatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    if not payload.events:
        return {"received": 0}

    device_ids = {event.device_id for event in payload.events}
    devices = db.query(Device).filter(Device.id.in_(device_ids)).all()
    devices_by_id = {device.id: device for device in devices}

    for device_id in device_ids:
        device = devices_by_id.get(device_id)
        if not device:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Device not found.")
        if not device.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Device is inactive.")
        if device.user_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted.")

    now = datetime.now(timezone.utc)
    events = []
    latest_by_device: dict[int, LocationEvent | None] = {}
    for device_id in device_ids:
        latest_by_device[device_id] = (
            db.query(LocationEvent)
            .filter(LocationEvent.device_id == device_id)
            .order_by(LocationEvent.ts.desc())
            .first()
        )

    for event in payload.events:
        prev = latest_by_device.get(event.device_id)
        distance_m = None
        gap_seconds = None
        speed_kmh = None
        suspicious_jump = False
        tamper_flags: list[str] = []

        if prev:
            gap_seconds = (event.ts - prev.ts).total_seconds()
            if gap_seconds < 0:
                tamper_flags.append("out_of_order")
            else:
                distance_m = haversine_distance_m(prev.lat, prev.lng, event.lat, event.lng)
                if gap_seconds > 0:
                    speed_kmh = (distance_m / gap_seconds) * 3.6
                    if speed_kmh > 160:
                        suspicious_jump = True
                        tamper_flags.append("speed_jump")
                if gap_seconds > 900:
                    tamper_flags.append("gap_over_15m")
                if distance_m is not None and gap_seconds is not None and gap_seconds < 120 and distance_m > 5000:
                    suspicious_jump = True
                    tamper_flags.append("distance_jump")

        if event.accuracy_m is not None and settings.gps_min_accuracy_m > 0:
            if event.accuracy_m > settings.gps_min_accuracy_m:
                tamper_flags.append("low_accuracy")

        if event.ts > now + timedelta(minutes=5):
            tamper_flags.append("future_ts")

        events.append(
            LocationEvent(
                device_id=event.device_id,
                ts=event.ts,
                lat=event.lat,
                lng=event.lng,
                accuracy_m=event.accuracy_m,
                source=event.source,
                distance_m=distance_m,
                gap_seconds=gap_seconds,
                speed_kmh=speed_kmh,
                suspicious_jump=suspicious_jump,
                tamper_flags=json.dumps(tamper_flags) if tamper_flags else None,
            )
        )
        if prev is None or event.ts > prev.ts:
            latest_by_device[event.device_id] = events[-1]
    db.add_all(events)

    latest_ts_by_device = {}
    for event in payload.events:
        latest_ts = latest_ts_by_device.get(event.device_id)
        if latest_ts is None or event.ts > latest_ts:
            latest_ts_by_device[event.device_id] = event.ts

    for device_id, last_ts in latest_ts_by_device.items():
        device = devices_by_id[device_id]
        device.last_seen_at = last_ts

    db.commit()
    return {"received": len(events)}


@router.post("/location_events")
def ingest_location_event(
    payload: LocationEventIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    batch = LocationEventBatch(events=[payload])
    return ingest_location_events(batch, current_user, db)
