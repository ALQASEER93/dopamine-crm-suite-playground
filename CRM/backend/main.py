import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from api import api_router
from core.config import settings
from core.db import Base, SessionLocal, build_fallback_engine, engine, swap_engine
from services.seed_data import seed_reference_data

logger = logging.getLogger(__name__)

tags_metadata = [
    {"name": "default", "description": "Health and default info endpoints."},
    {"name": "health", "description": "Service health and readiness."},
    {"name": "hcps", "description": "Healthcare providers CRUD."},
    {"name": "dpm_ledger", "description": "DPM Ledger summaries and statements."},
    {"name": "admin_ai", "description": "AI insights, tasks, drafts, and collection plans."},
    {"name": "auth", "description": "Authentication and current user endpoints."},
    {"name": "doctors", "description": "Doctor master data management."},
    {"name": "pharmacies", "description": "Pharmacy master data management."},
    {"name": "products", "description": "Product catalog and pricing."},
    {"name": "reps", "description": "Sales reps and routes."},
    {"name": "visits", "description": "Field visit capture and reporting."},
    {"name": "orders", "description": "Order capture and line items."},
    {"name": "stock", "description": "Stock locations and movements."},
    {"name": "targets", "description": "Sales targets tracking."},
    {"name": "collections", "description": "Collections and receipts."},
]


def init_database() -> None:
    """
    Import models and create tables if they do not exist.
    SQLAlchemy uses the imported metadata to build the schema.
    """
    import models  # noqa: F401

    db_url = str(engine.url)
    logger.info("Initializing database at %s", db_url)
    try:
        Base.metadata.create_all(bind=engine)
    except OperationalError as exc:
        if "disk i/o error" in str(exc).lower():
            fallback_engine = build_fallback_engine()
            swap_engine(fallback_engine)
            Base.metadata.create_all(bind=fallback_engine)
            logger.warning(
                "Database I/O error on primary path (%s); using fallback %s. "
                "Consider moving DB to a writable drive.",
                db_url,
                fallback_engine.url,
            )
        else:
            raise
    with SessionLocal() as session:
        seed_reference_data(session)
    logger.info("Database schema ensured and seeded.")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize database and seed reference data once on startup."""
    init_database()
    yield


app = FastAPI(title=settings.app_name, openapi_tags=tags_metadata, lifespan=lifespan)

allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

# Single CORS middleware to allow the SPA to call all API routes, including preflight.
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/", tags=["default"])
async def read_root() -> dict:
    return {"message": "Welcome to ALQASEER CRM API"}


@app.get("/status", tags=["default"])
async def read_status() -> dict:
    return {"status": "ok"}


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=settings.app_version,
        description="ALQASEER CRM API",
        routes=app.routes,
        tags=tags_metadata,
    )
    openapi_schema.setdefault("components", {}).setdefault("securitySchemes", {}).update(
        {
            "BearerAuth": {
                "type": "http",
                "scheme": "bearer",
                "bearerFormat": "JWT",
                "description": "Provide JWT as: Bearer <token>",
            }
        }
    )
    openapi_schema["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi  # type: ignore[assignment]

app.include_router(api_router, prefix="/api")


if __name__ == "__main__":
    import sys
    import uvicorn

    if len(sys.argv) > 1 and sys.argv[1] == "init-db":
        init_database()
        print("Database initialized.")
        sys.exit(0)

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
