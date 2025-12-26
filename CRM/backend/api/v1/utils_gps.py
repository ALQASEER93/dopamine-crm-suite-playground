from __future__ import annotations

import math
from typing import Optional

from core.config import settings


class GPSValidationError(ValueError):
    pass


def _to_radians(value: float) -> float:
    return value * math.pi / 180.0


def haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius_m = 6371000.0
    dlat = _to_radians(lat2 - lat1)
    dlng = _to_radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(_to_radians(lat1)) * math.cos(_to_radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_m * c


def validate_accuracy(accuracy: Optional[float]) -> None:
    threshold = settings.gps_min_accuracy_m
    if accuracy is None or threshold is None or threshold <= 0:
        return
    if accuracy > threshold:
        raise GPSValidationError(
            f"GPS accuracy is too low (>{threshold}m). Please ensure GPS signal is strong."
        )


def validate_max_distance(
    start_lat: Optional[float],
    start_lng: Optional[float],
    end_lat: Optional[float],
    end_lng: Optional[float],
) -> None:
    limit = settings.gps_max_distance_m
    if limit is None or limit <= 0:
        return
    if start_lat is None or start_lng is None or end_lat is None or end_lng is None:
        return
    distance = haversine_distance_m(start_lat, start_lng, end_lat, end_lng)
    if distance > limit:
        raise GPSValidationError(
            f"Visit GPS distance exceeded ({distance:.1f}m > {limit}m)."
        )


def policy_snapshot() -> dict:
    return {
        "gpsMaxDistanceM": settings.gps_max_distance_m,
        "gpsMinAccuracyM": settings.gps_min_accuracy_m,
        "geofenceRadiusM": settings.geofence_radius_m,
    }
