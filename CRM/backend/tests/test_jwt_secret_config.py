"""
Tests for JWT Secret environment variable configuration.
"""
from __future__ import annotations

import os
import pytest

from config.settings import Settings


def test_jwt_secret_defaults_in_development():
    """Test that JWT_SECRET defaults to development-secret in development."""
    # Clear any existing JWT_SECRET from environment
    original = os.environ.pop("JWT_SECRET", None)
    try:
        os.environ.pop("DPM_ENV", None)  # Ensure development mode
        settings = Settings()
        assert settings.jwt_secret == "development-secret"
    finally:
        if original:
            os.environ["JWT_SECRET"] = original


def test_jwt_secret_from_environment():
    """Test that JWT_SECRET can be set from environment variable."""
    original = os.environ.get("JWT_SECRET")
    try:
        os.environ["JWT_SECRET"] = "test-secret-from-env"
        settings = Settings()
        assert settings.jwt_secret == "test-secret-from-env"
    finally:
        if original:
            os.environ["JWT_SECRET"] = original
        else:
            os.environ.pop("JWT_SECRET", None)


def test_jwt_secret_required_in_production():
    """Test that JWT_SECRET is required in production (not using default)."""
    original_jwt = os.environ.pop("JWT_SECRET", None)
    original_env = os.environ.get("DPM_ENV")
    try:
        # Set production mode
        os.environ["DPM_ENV"] = "production"
        # Don't set JWT_SECRET
        
        # Should raise ValueError because default secret is used in production
        with pytest.raises(ValueError, match="JWT_SECRET must be set in production"):
            Settings()
    finally:
        if original_jwt:
            os.environ["JWT_SECRET"] = original_jwt
        if original_env:
            os.environ["DPM_ENV"] = original_env
        else:
            os.environ.pop("DPM_ENV", None)


def test_jwt_secret_production_with_env_var():
    """Test that production works when JWT_SECRET is set."""
    original_jwt = os.environ.get("JWT_SECRET")
    original_env = os.environ.get("DPM_ENV")
    try:
        os.environ["DPM_ENV"] = "production"
        os.environ["JWT_SECRET"] = "production-secret-key"
        settings = Settings()
        assert settings.jwt_secret == "production-secret-key"
        assert settings.app_env == "production"
    finally:
        if original_jwt:
            os.environ["JWT_SECRET"] = original_jwt
        else:
            os.environ.pop("JWT_SECRET", None)
        if original_env:
            os.environ["DPM_ENV"] = original_env
        else:
            os.environ.pop("DPM_ENV", None)

