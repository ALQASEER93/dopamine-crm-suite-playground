from __future__ import annotations

from collections import deque
import os
from threading import Lock
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from core.config import settings
from core.db import get_db
from core.security import get_current_user
from models.crm import User
from schemas.auth import AuthResponse, BootstrapRequest, LoginRequest
from schemas.user import UserOut
from services.auth import authenticate, bootstrap_admin, has_admin_user, issue_token

router = APIRouter(prefix="/auth", tags=["auth"])
_RATE_WINDOW_SECONDS = 60
_RATE_MAX_ATTEMPTS = 10
_login_attempts: dict[str, deque[float]] = {}
_login_attempts_lock = Lock()


def _login_rate_key(request: Request, email: str) -> str:
    client = request.client.host if request.client else "unknown"
    return f"{client}:{email.strip().lower()}"


def _enforce_login_rate_limit(request: Request, email: str) -> None:
    if os.environ.get("PYTEST_CURRENT_TEST"):
        return
    now = time.time()
    threshold = now - _RATE_WINDOW_SECONDS
    key = _login_rate_key(request, email)
    with _login_attempts_lock:
        bucket = _login_attempts.setdefault(key, deque())
        while bucket and bucket[0] < threshold:
            bucket.popleft()
        if len(bucket) >= _RATE_MAX_ATTEMPTS:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many login attempts. Please try again in a minute.",
            )
        bucket.append(now)


@router.post("/login", response_model=AuthResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> AuthResponse:
    _enforce_login_rate_limit(request, payload.email)
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
