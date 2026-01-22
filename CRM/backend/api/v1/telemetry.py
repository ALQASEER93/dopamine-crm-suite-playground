from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.config import settings
from core.db import get_db
from core.security import get_current_user
from models.crm import TelemetryLocation, TelemetrySession, User
from schemas.telemetry import TelemetryLocationIn, TelemetrySessionStart, TelemetrySessionStop

router = APIRouter(
    prefix="/telemetry",
    tags=["telemetry"],
    dependencies=[Depends(get_current_user)],
)


def _normalize_timestamp(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _validate_timestamp(value: datetime, *, max_age_hours: int = 24) -> datetime:
    now = datetime.now(timezone.utc)
    normalized = _normalize_timestamp(value)
    if normalized > now + timedelta(minutes=5):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timestamp is in the future.",
        )
    if normalized < now - timedelta(hours=max_age_hours):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Timestamp is too old.",
        )
    return normalized


def _validate_accuracy(accuracy: float | None) -> None:
    if accuracy is None:
        return
    if accuracy > settings.gps_min_accuracy_m:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GPS accuracy is below required threshold.",
        )


def _get_or_create_session(
    db: Session,
    *,
    session_id: str,
    current_user: User,
    started_at: datetime,
    device_id: str | None,
    app_version: str | None,
    platform: str | None,
) -> TelemetrySession:
    session = db.query(TelemetrySession).filter(TelemetrySession.session_id == session_id).first()
    if session:
        return session

    session = TelemetrySession(
        session_id=session_id,
        rep_id=current_user.id,
        started_at=started_at,
        device_id=device_id,
        app_version=app_version,
        platform=platform,
    )
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/session/start")
def start_session(
    payload: TelemetrySessionStart,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    started_at = _validate_timestamp(payload.started_at)
    session = _get_or_create_session(
        db,
        session_id=payload.session_id,
        current_user=current_user,
        started_at=started_at,
        device_id=payload.device_id,
        app_version=payload.app_version,
        platform=payload.platform,
    )
    return {"sessionId": session.session_id, "startedAt": session.started_at.isoformat()}


@router.post("/session/stop")
def stop_session(
    payload: TelemetrySessionStop,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    stopped_at = _validate_timestamp(payload.stopped_at)
    session = (
        db.query(TelemetrySession)
        .filter(
            TelemetrySession.session_id == payload.session_id,
            TelemetrySession.rep_id == current_user.id,
        )
        .first()
    )
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
    session.stopped_at = stopped_at
    db.commit()
    return {"sessionId": session.session_id, "stoppedAt": session.stopped_at.isoformat()}


@router.post("/location")
def location_ping(
    payload: TelemetryLocationIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    recorded_at = _validate_timestamp(payload.recorded_at)
    _validate_accuracy(payload.accuracy_m)

    session = db.query(TelemetrySession).filter(TelemetrySession.session_id == payload.session_id).first()
    if not session:
        session = _get_or_create_session(
            db,
            session_id=payload.session_id,
            current_user=current_user,
            started_at=recorded_at,
            device_id=payload.device_id,
            app_version=None,
            platform=None,
        )

    location = TelemetryLocation(
        session_id=session.session_id,
        rep_id=current_user.id,
        lat=payload.lat,
        lng=payload.lng,
        accuracy_m=payload.accuracy_m,
        recorded_at=recorded_at,
        device_id=payload.device_id,
    )
    db.add(location)
    db.commit()
    db.refresh(location)
    return {"id": location.id, "recordedAt": location.recorded_at.isoformat()}
