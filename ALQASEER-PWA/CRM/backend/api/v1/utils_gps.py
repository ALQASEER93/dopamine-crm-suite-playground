from __future__ import annotations

import logging
import math
from typing import Optional

from core.config import settings

logger = logging.getLogger(__name__)


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
        logger.warning("GPS accuracy too low (accuracy=%s threshold=%s).", accuracy, threshold)
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
        logger.warning("Visit GPS distance exceeded (distance=%s limit=%s).", distance, limit)
        raise GPSValidationError(
            f"Visit GPS distance exceeded ({distance:.1f}m > {limit}m)."
        )


def policy_snapshot() -> dict:
    return {
        "gpsMaxDistanceM": settings.gps_max_distance_m,
        "gpsMinAccuracyM": settings.gps_min_accuracy_m,
        "allowGpsOverride": settings.allow_gps_override,
        "geofenceRadiusM": settings.geofence_radius_m,
        "geofenceEnabled": settings.geofence_enabled,
        "geofenceRequireTargetCoords": settings.geofence_require_target_coords,
    }


def _is_valid_lat_lng(lat: float, lng: float) -> bool:
    return -90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0


def validate_geofence_enhanced(
    user_lat: Optional[float],
    user_lng: Optional[float],
    target_lat: Optional[float],
    target_lng: Optional[float],
    *,
    radius_m: Optional[float] = None,
    enabled: Optional[bool] = None,
    require_target_coords: Optional[bool] = None,
) -> None:
    """Validate user is within a geofence radius of a target location.

    Backward-compatibility: can be feature-flagged off via settings.geofence_enabled
    (or explicitly via `enabled=`). When disabled, this is a no-op.
    """
    effective_enabled = settings.geofence_enabled if enabled is None else enabled
    if not effective_enabled:
        return

    effective_require_target_coords = (
        settings.geofence_require_target_coords
        if require_target_coords is None
        else require_target_coords
    )
    if target_lat is None or target_lng is None:
        if effective_require_target_coords:
            logger.warning("Geofence validation failed: target coordinates are missing.")
            raise GPSValidationError(
                "Target location coordinates are missing; cannot start visit while strict geofence is enabled."
            )
        return

    limit = radius_m if radius_m is not None else settings.geofence_radius_m
    if limit is None or limit <= 0:
        return

    if user_lat is None or user_lng is None:
        logger.warning("Geofence validation failed: missing user coordinates.")
        raise GPSValidationError("GPS location is required to start the visit.")

    if not all(map(math.isfinite, (user_lat, user_lng, target_lat, target_lng))):
        logger.warning("Geofence validation failed: non-finite coordinates.")
        raise GPSValidationError("Invalid GPS coordinates.")

    if not _is_valid_lat_lng(user_lat, user_lng) or not _is_valid_lat_lng(target_lat, target_lng):
        logger.warning("Geofence validation failed: out-of-range coordinates.")
        raise GPSValidationError("Invalid GPS coordinates.")

    distance = haversine_distance_m(user_lat, user_lng, target_lat, target_lng)
    if distance > limit:
        logger.warning("Geofence validation failed (distance=%s limit=%s).", distance, limit)
        raise GPSValidationError(
            f"You are {distance:.0f}m away from the location (limit: {limit}m). "
            "Please get closer to start the visit."
        )


def validate_geofence(
    user_lat: Optional[float],
    user_lng: Optional[float],
    target_lat: Optional[float],
    target_lng: Optional[float],
    radius_m: Optional[float] = None,
) -> None:
    """Backward-compatible wrapper around validate_geofence_enhanced()."""
    validate_geofence_enhanced(
        user_lat,
        user_lng,
        target_lat,
        target_lng,
        radius_m=radius_m,
    )
