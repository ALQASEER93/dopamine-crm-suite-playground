from fastapi import APIRouter, Depends

from api import admin_ai, dev, hcps
from api.v1 import router as api_v1_router
from core.config import settings
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


def _legacy_erp_api_enabled() -> bool:
    return bool(settings.enable_legacy_erp_api)


if _legacy_erp_api_enabled():
    api_router.include_router(
        dpm_ledger_router.router,
        prefix="/admin/dpm-ledger",
        tags=["dpm_ledger"],
        dependencies=[Depends(require_roles("admin", "sales_manager"))],
    )
    api_router.include_router(
        admin_ai.router,
        prefix="/admin/ai",
        tags=["admin_ai"],
        dependencies=[Depends(require_roles("admin", "sales_manager"))],
    )


def _should_mount_dev_router() -> bool:
    app_env = (settings.app_env or "").strip().lower()
    vercel_env = (settings.vercel_env or "").strip().lower()
    return app_env == "development" and vercel_env not in {"preview", "production"}


if _should_mount_dev_router():
    api_router.include_router(dev.router, prefix="/dev", tags=["default"])
