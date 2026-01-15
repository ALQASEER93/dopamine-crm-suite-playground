from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TelemetryLocationIn(BaseModel):
    lat: float = Field(..., description="Latitude in decimal degrees.")
    lng: float = Field(..., description="Longitude in decimal degrees.")
    accuracy: Optional[float] = Field(None, description="Accuracy in meters.")
    speed: Optional[float] = Field(None, description="Speed in m/s.")
    bearing: Optional[float] = Field(None, description="Bearing in degrees.")
    ts: Optional[datetime] = Field(None, description="Timestamp (UTC).")
    device_info: Optional[str] = Field(None, description="Device metadata blob.")
    source: Optional[str] = Field(None, description="Source identifier.")


class TelemetryLocationOut(BaseModel):
    id: int
    rep_id: int
    rep_name: Optional[str] = None
    lat: float
    lng: float
    accuracy_m: Optional[float] = None
    speed_mps: Optional[float] = None
    bearing_deg: Optional[float] = None
    ts: datetime
    device_info: Optional[str] = None
    source: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
