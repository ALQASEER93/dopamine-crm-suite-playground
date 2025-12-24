from fastapi import APIRouter

from api.v1 import (
    auth,
    collections,
    doctors,
    health,
    reports,
    territories,
    admin_users,
    orders,
    pharmacies,
    products,
    reps,
    stock,
    targets,
    visits,
)

router = APIRouter(prefix="/v1")

router.include_router(auth.router)
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
router.include_router(territories.router)
router.include_router(admin_users.router)
router.include_router(reports.router)
