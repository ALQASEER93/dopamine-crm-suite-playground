from __future__ import annotations

import base64
import json
import os
import time

try:
    import jwt  # type: ignore
except Exception:  # noqa: BLE001
    jwt = None

from fastapi import APIRouter, HTTPException

from core.config import settings
from core.db import SessionLocal
from models.crm import Role, User
from services.auth import hash_password

router = APIRouter(tags=["default"])


def _dev_token_enabled() -> tuple[bool, str]:
    app_env = os.environ.get("APP_ENV", "").strip().lower()
    dpm_env = os.environ.get("DPM_ENV", "").strip().lower()
    allow_flag = os.environ.get("ALLOW_DEV_TOKEN", "").strip()

    if app_env == "production" or dpm_env == "production":
        return False, "Dev token endpoint disabled in production."
    if app_env != "development":
        return False, "Dev token endpoint requires APP_ENV=development."
    if allow_flag != "1":
        return False, "Dev token endpoint disabled."
    return True, ""


def _manual_encode(payload: dict, secret: str) -> str:
    header = {"typ": "JWT", "alg": "HS256"}
    def b64(data: dict) -> str:
        return base64.urlsafe_b64encode(json.dumps(data).encode()).rstrip(b"=").decode()

    segments = [b64(header), b64(payload)]
    signing_input = ".".join(segments).encode()
    import hmac
    import hashlib

    signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    segments.append(base64.urlsafe_b64encode(signature).rstrip(b"=").decode())
    return ".".join(segments)


@router.get("/token")
def dev_token() -> dict:
    enabled, reason = _dev_token_enabled()
    if not enabled:
        raise HTTPException(status_code=403, detail=reason)

    password = os.environ.get("DEV_TOKEN_PASSWORD", "").strip()
    if not password:
        raise HTTPException(
            status_code=400,
            detail="DEV_TOKEN_PASSWORD is required to issue dev tokens.",
        )

    with SessionLocal() as session:
        admin_role = session.query(Role).filter(Role.slug == "admin").first()
        user = session.query(User).filter(User.email == "dev-admin@dopaminepharma.com").first()
        if not admin_role:
            admin_role = Role(slug="admin", name="Admin")
            session.add(admin_role)
            session.flush()

        if not user:
            user = User(
                email="dev-admin@dopaminepharma.com",
                name="Dev Admin",
                role_id=admin_role.id,
                is_active=True,
                password_hash=hash_password(password),
            )
            session.add(user)
            session.commit()
        sub = str(user.id)
        role_slug = admin_role.slug

    now = int(time.time())
    payload = {
        "sub": sub,
        "role": role_slug,
        "iat": now,
        "exp": now + 3600,
        "env": "development-only",
    }
    if jwt:
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    else:
        token = _manual_encode(payload, settings.jwt_secret)
    return {"token": token, "note": "Development-only token with admin role. Do NOT use in production."}
