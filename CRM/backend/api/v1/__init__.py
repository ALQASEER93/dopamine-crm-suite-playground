from fastapi import APIRouter

from api.v1 import (
    auth,
    collections,
    gps_policy,
    hcps,
    doctors,
    meta,
    health,
    orders,
    pharmacies,
    products,
    reports,
    routes,
    reps,
    stock,
    targets,
    visit_targets,
    territories,
    visits,
    admin_users,
    telemetry,
    pwa,
    tracking,
)

router = APIRouter(prefix="/v1")

router.include_router(auth.router)
router.include_router(meta.router)
router.include_router(gps_policy.router)
router.include_router(hcps.router)
router.include_router(doctors.router)
router.include_router(pharmacies.router)
router.include_router(products.router)
router.include_router(reps.router)
router.include_router(visits.router)
router.include_router(orders.router)
router.include_router(stock.router)
router.include_router(targets.router)
router.include_router(visit_targets.router)
router.include_router(collections.router)
router.include_router(health.router)
router.include_router(reports.router)
router.include_router(routes.router)
router.include_router(territories.router)
router.include_router(admin_users.router)
router.include_router(telemetry.router)
router.include_router(pwa.router)
router.include_router(tracking.router)
