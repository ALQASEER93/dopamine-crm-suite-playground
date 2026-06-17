from __future__ import annotations

from fastapi import APIRouter, Depends

from api.v1.utils_gps import policy_snapshot
from core.security import get_current_user, require_roles

router = APIRouter(
    prefix="/admin/gps-policy",
    tags=["gps_policy"],
    dependencies=[Depends(get_current_user), Depends(require_roles("admin", "sales_manager"))],
)


@router.get("")
def get_gps_policy() -> dict:
    return {"data": policy_snapshot()}
