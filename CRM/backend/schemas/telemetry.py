from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class TelemetrySessionStart(BaseModel):
    session_id: str = Field(..., alias="sessionId")
    started_at: datetime = Field(..., alias="startedAt")
    device_id: Optional[str] = Field(None, alias="deviceId")
    app_version: Optional[str] = Field(None, alias="appVersion")
    platform: Optional[str] = None


class TelemetrySessionStop(BaseModel):
    session_id: str = Field(..., alias="sessionId")
    stopped_at: datetime = Field(..., alias="stoppedAt")


class TelemetryLocationIn(BaseModel):
    session_id: str = Field(..., alias="sessionId")
    lat: float
    lng: float
    accuracy_m: Optional[float] = Field(None, alias="accuracy")
    recorded_at: datetime = Field(..., alias="recordedAt")
    device_id: Optional[str] = Field(None, alias="deviceId")
