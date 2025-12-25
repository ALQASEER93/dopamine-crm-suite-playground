"""
GPS validation utilities for visit tracking.
"""
from __future__ import annotations

from typing import Optional


# GPS accuracy threshold in meters (reject if accuracy > 100m)
GPS_ACCURACY_THRESHOLD_METERS = 100.0

# Valid coordinate ranges
LATITUDE_MIN = -90.0
LATITUDE_MAX = 90.0
LONGITUDE_MIN = -180.0
LONGITUDE_MAX = 180.0


class GPSValidationError(ValueError):
    """Raised when GPS validation fails."""

    pass


def validate_latitude(lat: float, field_name: str = "latitude") -> None:
    """
    Validate latitude coordinate.
    
    Args:
        lat: Latitude value
        field_name: Field name for error messages
        
    Raises:
        GPSValidationError: If latitude is out of valid range
    """
    if not isinstance(lat, (int, float)):
        raise GPSValidationError(f"{field_name} must be a number.")
    
    if not (LATITUDE_MIN <= lat <= LATITUDE_MAX):
        raise GPSValidationError(
            f"{field_name} must be between {LATITUDE_MIN} and {LATITUDE_MAX} degrees."
        )


def validate_longitude(lng: float, field_name: str = "longitude") -> None:
    """
    Validate longitude coordinate.
    
    Args:
        lng: Longitude value
        field_name: Field name for error messages
        
    Raises:
        GPSValidationError: If longitude is out of valid range
    """
    if not isinstance(lng, (int, float)):
        raise GPSValidationError(f"{field_name} must be a number.")
    
    if not (LONGITUDE_MIN <= lng <= LONGITUDE_MAX):
        raise GPSValidationError(
            f"{field_name} must be between {LONGITUDE_MIN} and {LONGITUDE_MAX} degrees."
        )


def validate_accuracy(accuracy: Optional[float], field_name: str = "accuracy", require_accurate: bool = True) -> None:
    """
    Validate GPS accuracy.
    
    Args:
        accuracy: Accuracy value in meters
        field_name: Field name for error messages
        require_accurate: If True, reject accuracy > threshold. If False, only validate if provided.
        
    Raises:
        GPSValidationError: If accuracy exceeds threshold
    """
    if accuracy is None:
        if require_accurate:
            raise GPSValidationError(f"{field_name} is required for field visits.")
        return
    
    if not isinstance(accuracy, (int, float)):
        raise GPSValidationError(f"{field_name} must be a number.")
    
    if accuracy < 0:
        raise GPSValidationError(f"{field_name} must be non-negative.")
    
    if require_accurate and accuracy > GPS_ACCURACY_THRESHOLD_METERS:
        raise GPSValidationError(
            f"{field_name} is too low (>{GPS_ACCURACY_THRESHOLD_METERS}m). "
            f"GPS accuracy of {accuracy:.1f}m exceeds the maximum allowed threshold. "
            f"Please ensure GPS signal is strong before recording visit."
        )


def validate_gps_coordinates(
    lat: Optional[float],
    lng: Optional[float],
    accuracy: Optional[float] = None,
    require_gps: bool = True,
    require_accurate: bool = True,
    field_prefix: str = "GPS",
) -> None:
    """
    Validate GPS coordinates (latitude, longitude, accuracy).
    
    Args:
        lat: Latitude
        lng: Longitude
        accuracy: Accuracy in meters (optional)
        require_gps: If True, lat/lng are required. If False, they're optional.
        require_accurate: If True, accuracy must be provided and <= threshold
        field_prefix: Prefix for field names in error messages
        
    Raises:
        GPSValidationError: If validation fails
    """
    if require_gps:
        if lat is None:
            raise GPSValidationError(f"{field_prefix} latitude is required for field visits.")
        if lng is None:
            raise GPSValidationError(f"{field_prefix} longitude is required for field visits.")
        
        validate_latitude(lat, f"{field_prefix} latitude")
        validate_longitude(lng, f"{field_prefix} longitude")
    else:
        # Optional GPS - validate only if provided
        if lat is not None:
            validate_latitude(lat, f"{field_prefix} latitude")
        if lng is not None:
            validate_longitude(lng, f"{field_prefix} longitude")
        # If one is provided, both should be provided
        if (lat is not None) != (lng is not None):
            raise GPSValidationError(
                f"{field_prefix}: Both latitude and longitude must be provided together."
            )
    
    # Validate accuracy if provided or required
    if accuracy is not None or require_accurate:
        validate_accuracy(accuracy, f"{field_prefix} accuracy", require_accurate=require_accurate)

