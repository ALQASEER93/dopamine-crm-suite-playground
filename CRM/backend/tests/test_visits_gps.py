"""
Tests for GPS validation in visit tracking.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.v1.utils_gps import (
    GPS_ACCURACY_THRESHOLD_METERS,
    GPSValidationError,
    validate_accuracy,
    validate_gps_coordinates,
    validate_latitude,
    validate_longitude,
)
from schemas.crm import VisitEnd, VisitStart


def test_validate_latitude_valid():
    """Test latitude validation with valid values."""
    validate_latitude(0.0)
    validate_latitude(90.0)
    validate_latitude(-90.0)
    validate_latitude(31.9539)  # Example: Amman, Jordan


def test_validate_latitude_invalid():
    """Test latitude validation with invalid values."""
    with pytest.raises(GPSValidationError, match="must be between"):
        validate_latitude(91.0)
    
    with pytest.raises(GPSValidationError, match="must be between"):
        validate_latitude(-91.0)
    
    with pytest.raises(GPSValidationError, match="must be a number"):
        validate_latitude("invalid")


def test_validate_longitude_valid():
    """Test longitude validation with valid values."""
    validate_longitude(0.0)
    validate_longitude(180.0)
    validate_longitude(-180.0)
    validate_longitude(35.9106)  # Example: Amman, Jordan


def test_validate_longitude_invalid():
    """Test longitude validation with invalid values."""
    with pytest.raises(GPSValidationError, match="must be between"):
        validate_longitude(181.0)
    
    with pytest.raises(GPSValidationError, match="must be between"):
        validate_longitude(-181.0)
    
    with pytest.raises(GPSValidationError, match="must be a number"):
        validate_longitude("invalid")


def test_validate_accuracy_valid():
    """Test accuracy validation with valid values."""
    validate_accuracy(0.0, require_accurate=True)
    validate_accuracy(50.0, require_accurate=True)
    validate_accuracy(100.0, require_accurate=True)  # At threshold
    validate_accuracy(None, require_accurate=False)  # Optional


def test_validate_accuracy_invalid():
    """Test accuracy validation with invalid values."""
    # Accuracy exceeds threshold
    with pytest.raises(GPSValidationError, match="too low"):
        validate_accuracy(101.0, require_accurate=True)
    
    with pytest.raises(GPSValidationError, match="too low"):
        validate_accuracy(200.0, require_accurate=True)
    
    # Negative accuracy
    with pytest.raises(GPSValidationError, match="non-negative"):
        validate_accuracy(-1.0, require_accurate=True)
    
    # Invalid type
    with pytest.raises(GPSValidationError, match="must be a number"):
        validate_accuracy("invalid", require_accurate=True)


def test_validate_gps_coordinates_valid():
    """Test GPS coordinates validation with valid values."""
    validate_gps_coordinates(31.9539, 35.9106, 50.0, require_gps=True, require_accurate=True)
    validate_gps_coordinates(0.0, 0.0, 10.0, require_gps=True, require_accurate=True)
    # Optional GPS
    validate_gps_coordinates(None, None, None, require_gps=False, require_accurate=False)


def test_validate_gps_coordinates_invalid():
    """Test GPS coordinates validation with invalid values."""
    # Missing coordinates
    with pytest.raises(GPSValidationError, match="required"):
        validate_gps_coordinates(None, 35.9106, 50.0, require_gps=True, require_accurate=True)
    
    # Invalid latitude
    with pytest.raises(GPSValidationError, match="latitude"):
        validate_gps_coordinates(91.0, 35.9106, 50.0, require_gps=True, require_accurate=True)
    
    # Invalid accuracy
    with pytest.raises(GPSValidationError, match="too low"):
        validate_gps_coordinates(31.9539, 35.9106, 150.0, require_gps=True, require_accurate=True)


def test_visit_start_valid_gps():
    """Test VisitStart with valid GPS coordinates."""
    visit = VisitStart(lat=31.9539, lng=35.9106, accuracy=50.0)
    assert visit.lat == 31.9539
    assert visit.lng == 35.9106
    assert visit.accuracy == 50.0


def test_visit_start_invalid_accuracy():
    """Test VisitStart with accuracy exceeding threshold."""
    with pytest.raises(ValidationError) as exc_info:
        VisitStart(lat=31.9539, lng=35.9106, accuracy=150.0)
    
    errors = exc_info.value.errors()
    assert any("too low" in str(error.get("msg", "")).lower() for error in errors)


def test_visit_start_invalid_latitude():
    """Test VisitStart with invalid latitude."""
    with pytest.raises(ValidationError) as exc_info:
        VisitStart(lat=91.0, lng=35.9106, accuracy=50.0)
    
    errors = exc_info.value.errors()
    assert any("latitude" in str(error.get("msg", "")).lower() for error in errors)


def test_visit_start_incomplete_gps():
    """Test VisitStart with incomplete GPS (lat without lng)."""
    with pytest.raises(ValidationError) as exc_info:
        VisitStart(lat=31.9539, lng=None, accuracy=50.0)
    
    errors = exc_info.value.errors()
    assert any("longitude" in str(error.get("msg", "")).lower() for error in errors)


def test_visit_end_valid_gps():
    """Test VisitEnd with valid GPS coordinates."""
    visit = VisitEnd(lat=31.9539, lng=35.9106, accuracy=50.0)
    assert visit.lat == 31.9539
    assert visit.lng == 35.9106
    assert visit.accuracy == 50.0


def test_visit_end_invalid_accuracy():
    """Test VisitEnd with accuracy exceeding threshold."""
    with pytest.raises(ValidationError) as exc_info:
        VisitEnd(lat=31.9539, lng=35.9106, accuracy=150.0)
    
    errors = exc_info.value.errors()
    assert any("too low" in str(error.get("msg", "")).lower() for error in errors)


def test_gps_accuracy_threshold_constant():
    """Test that GPS_ACCURACY_THRESHOLD_METERS is set correctly."""
    assert GPS_ACCURACY_THRESHOLD_METERS == 100.0


def test_gps_coordinates_optional_when_not_required():
    """Test that GPS coordinates can be optional when require_gps=False."""
    # Should not raise
    validate_gps_coordinates(None, None, None, require_gps=False, require_accurate=False)
    
    # But if one is provided, both should be
    with pytest.raises(GPSValidationError, match="together"):
        validate_gps_coordinates(31.9539, None, None, require_gps=False, require_accurate=False)

