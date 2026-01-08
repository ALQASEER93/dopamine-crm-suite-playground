from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Request

router = APIRouter(prefix="/meta", tags=["meta"])

REPO_ROOT = Path(__file__).resolve().parents[4]
BUILD_TIME = datetime.now(timezone.utc).isoformat()


def _read_git_commit() -> str:
    head_path = REPO_ROOT / ".git" / "HEAD"
    if not head_path.exists():
        return "unknown"
    head = head_path.read_text(encoding="utf-8").strip()
    if head.startswith("ref:"):
        ref_path = REPO_ROOT / ".git" / head.split(" ", 1)[1].strip()
        if ref_path.exists():
            return ref_path.read_text(encoding="utf-8").strip()
    return head


def _has_route(request: Request, path: str) -> bool:
    return any(getattr(route, "path", "") == path for route in request.app.routes)


@router.get("/version")
def get_version(request: Request) -> dict:
    git_commit = _read_git_commit()
    tracking_paths = [
        "/api/v1/devices/register",
        "/api/v1/location-events/batch",
        "/api/v1/reps/{rep_id}/tracking-status",
    ]
    openapi_has_tracking = all(_has_route(request, path) for path in tracking_paths)
    return {
        "repo_path": str(REPO_ROOT),
        "git_commit": git_commit,
        "build_time": BUILD_TIME,
        "openapi_has_tracking": openapi_has_tracking,
    }
