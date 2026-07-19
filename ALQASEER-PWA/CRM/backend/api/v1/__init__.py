from fastapi import APIRouter

from api.v1 import (
    auth,
    gps_policy,
    medical_affairs,
    hcps,
    doctors,
    health,
    pharmacies,
    products,
    samples,
    reports,
    reps,
    targets,
    territories,
    visits,
    admin_users,
    pwa,
)
from core.config import settings

router = APIRouter(prefix="/v1")

router.include_router(auth.router)
router.include_router(gps_policy.router)
router.include_router(hcps.router)
router.include_router(doctors.router)
router.include_router(pharmacies.router)
router.include_router(products.router)
router.include_router(reps.router)
router.include_router(visits.router)
router.include_router(targets.router)
router.include_router(health.router)
router.include_router(reports.router)
router.include_router(territories.router)
router.include_router(admin_users.router)
router.include_router(pwa.router)
router.include_router(samples.router)
router.include_router(medical_affairs.router)

if settings.enable_legacy_erp_api:
    from api.v1 import collections, orders, stock

    router.include_router(orders.router)
    router.include_router(stock.router)
    router.include_router(collections.router)
