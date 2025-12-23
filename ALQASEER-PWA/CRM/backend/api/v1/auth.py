from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.config import settings
from core.db import get_db
from core.security import get_current_user
from models.crm import User
from schemas.auth import AuthResponse, BootstrapRequest, LoginRequest
from schemas.user import UserOut
from services.auth import (
    authenticate,
    bootstrap_admin,
    ensure_admin_from_env,
    ensure_default_admin,
    has_admin_user,
    is_admin_reset_enabled,
    issue_token,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> AuthResponse:
    user = authenticate(db, payload.email, payload.password)
    if not user:
        default_email = settings.default_admin_email.lower()
        # Admin self-heal only when DEFAULT_ADMIN_RESET is enabled.
        if is_admin_reset_enabled() and payload.email.lower() == default_email:
            password = settings.default_admin_password or os.getenv("DEFAULT_ADMIN_PASSWORD")
            if password:
                ensure_admin_from_env(db)
                user = authenticate(db, payload.email, payload.password)
            if (
                not user
                and payload.email.lower() == "admin@example.com"
                and payload.password == "Admin12345!"
            ):
                ensure_default_admin(db)
                user = authenticate(db, payload.email, payload.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = issue_token(user, settings.jwt_expires_minutes)
    return AuthResponse(token=token, user=user)  # type: ignore[arg-type]


@router.post("/bootstrap", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def bootstrap(payload: BootstrapRequest, db: Session = Depends(get_db)) -> AuthResponse:
    if not settings.bootstrap_code:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bootstrap disabled.")
    if payload.code != settings.bootstrap_code:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid bootstrap code.")
    if has_admin_user(db):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Admin already exists.")

    try:
        user = bootstrap_admin(
            db,
            email=payload.email,
            name=payload.name,
            password=payload.password,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    token = issue_token(user, settings.jwt_expires_minutes)
    return AuthResponse(token=token, user=user)  # type: ignore[arg-type]


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)) -> User:
    return current_user
