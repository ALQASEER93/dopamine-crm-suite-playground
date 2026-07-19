from fastapi import APIRouter, Depends

from api import hcps
from api.v1 import router as api_v1_router
from core.security import require_roles

api_router = APIRouter()
api_router.include_router(
    hcps.router,
    prefix="/hcps",
    tags=["hcps"],
    dependencies=[Depends(require_roles("admin", "sales_manager"))],
)
api_router.include_router(api_v1_router, tags=["api_v1"])
