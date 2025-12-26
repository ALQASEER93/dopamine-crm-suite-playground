from fastapi import APIRouter

from api.v1 import (
    auth,
    collections,
    hcps,
    doctors,
    health,
    orders,
    pharmacies,
    products,
    reports,
    reps,
    stock,
    targets,
    territories,
    visits,
    admin_users,
    pwa,
)

router = APIRouter(prefix="/v1")

router.include_router(auth.router)
router.include_router(hcps.router)
router.include_router(doctors.router)
router.include_router(pharmacies.router)
router.include_router(products.router)
router.include_router(reps.router)
router.include_router(visits.router)
router.include_router(orders.router)
router.include_router(stock.router)
router.include_router(targets.router)
router.include_router(collections.router)
router.include_router(health.router)
router.include_router(reports.router)
router.include_router(territories.router)
router.include_router(admin_users.router)
router.include_router(pwa.router)
