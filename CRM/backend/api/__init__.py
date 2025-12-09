from fastapi import APIRouter, Depends

from api import admin_ai, dev, hcps
from api.v1 import router as api_v1_router
from core.security import require_roles
from dpm_ledger import router as dpm_ledger_router

api_router = APIRouter()
api_router.include_router(
    hcps.router,
    prefix="/hcps",
    tags=["hcps"],
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
api_router.include_router(api_v1_router, tags=["api_v1"])
api_router.include_router(
    dpm_ledger_router.router,
    prefix="/admin/dpm-ledger",
    tags=["dpm_ledger"],
)
api_router.include_router(
    admin_ai.router,
    prefix="/admin/ai",
    tags=["admin_ai"],
)
api_router.include_router(dev.router, prefix="/dev", tags=["default"])
