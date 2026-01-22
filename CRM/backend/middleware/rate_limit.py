from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Iterable

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from core.config import settings


@dataclass
class TokenBucket:
    capacity: float
    rate_per_second: float
    tokens: float
    last_refill: float

    def refill(self, now: float) -> None:
        elapsed = max(0.0, now - self.last_refill)
        if self.rate_per_second > 0:
            self.tokens = min(self.capacity, self.tokens + elapsed * self.rate_per_second)
        self.last_refill = now


class TokenBucketStore:
    def __init__(self, rate_per_minute: int, burst: int) -> None:
        self._lock = threading.Lock()
        self._buckets: dict[str, TokenBucket] = {}
        self.update_limits(rate_per_minute, burst)

    def update_limits(self, rate_per_minute: int, burst: int) -> None:
        self.rate_per_minute = rate_per_minute
        self.burst = burst
        self._rate_per_second = max(rate_per_minute, 0) / 60.0
        self._capacity = max(burst, 0)

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()

    def allow(self, key: str) -> bool:
        if self.rate_per_minute <= 0 or self.burst <= 0:
            return True

        now = time.monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if not bucket:
                bucket = TokenBucket(
                    capacity=float(self._capacity),
                    rate_per_second=float(self._rate_per_second),
                    tokens=float(self._capacity),
                    last_refill=now,
                )
                self._buckets[key] = bucket

            bucket.refill(now)
            if bucket.tokens >= 1:
                bucket.tokens -= 1
                return True
            return False


GLOBAL_LIMITER = TokenBucketStore(settings.rate_limit_per_minute, settings.rate_limit_burst)
SENSITIVE_LIMITER = TokenBucketStore(settings.rate_limit_per_minute, settings.rate_limit_burst)


def configure_rate_limits(rate_per_minute: int, burst: int) -> None:
    GLOBAL_LIMITER.update_limits(rate_per_minute, burst)
    SENSITIVE_LIMITER.update_limits(rate_per_minute, burst)


def reset_rate_limit_state() -> None:
    GLOBAL_LIMITER.reset()
    SENSITIVE_LIMITER.reset()


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, sensitive_prefixes: Iterable[str] | None = None) -> None:  # noqa: ANN001
        super().__init__(app)
        self._sensitive_prefixes = tuple(sensitive_prefixes or ("/api/v1/auth", "/api/admin", "/api/v1/admin"))

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        client_id = _get_client_id(request)
        path = request.url.path

        if _is_sensitive_path(path, self._sensitive_prefixes):
            if not SENSITIVE_LIMITER.allow(f"sensitive:{client_id}"):
                return _rate_limited_response("sensitive")

        if not GLOBAL_LIMITER.allow(f"global:{client_id}"):
            return _rate_limited_response("global")

        return await call_next(request)


def _get_client_id(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    if request.client:
        return request.client.host
    return "unknown"


def _is_sensitive_path(path: str, prefixes: Iterable[str]) -> bool:
    return any(path.startswith(prefix) for prefix in prefixes)


def _rate_limited_response(scope: str) -> JSONResponse:
    return JSONResponse(
        status_code=429,
        content={"detail": f"Rate limit exceeded ({scope}). Please retry later."},
    )
