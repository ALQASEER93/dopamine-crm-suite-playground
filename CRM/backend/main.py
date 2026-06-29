import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import ResponseValidationError
from fastapi.responses import JSONResponse
from fastapi.openapi.utils import get_openapi
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import OperationalError

from api import api_router
from core.config import settings
from core.db import Base, SessionLocal, build_fallback_engine, engine, swap_engine
from scripts.migrate_sqlite import run_sqlite_migrations
from services.startup_bootstrap_admin import maybe_bootstrap_admin_on_startup
from services.seed_data import seed_reference_data

logger = logging.getLogger(__name__)

tags_metadata = [
    {"name": "default", "description": "Health and default info endpoints."},
    {"name": "health", "description": "Service health and readiness."},
    {"name": "hcps", "description": "Healthcare providers CRUD."},
    {"name": "auth", "description": "Authentication and current user endpoints."},
    {"name": "doctors", "description": "Doctor master data management."},
    {"name": "pharmacies", "description": "Pharmacy master data management."},
    {"name": "products", "description": "Field-safe product catalog."},
    {"name": "reps", "description": "Sales reps and routes."},
    {"name": "visits", "description": "Field visit capture and reporting."},
    {"name": "targets", "description": "Sales targets tracking."},
]


def _env_flag_enabled(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "y", "on"}


def should_skip_startup_db_init() -> bool:
    """Avoid serverless cold-start failures; migrations/seeding are explicit outside Vercel."""
    if _env_flag_enabled(os.getenv("DPM_SKIP_STARTUP_DB_INIT")):
        return True
    return settings.app_env.lower() == "production" and _env_flag_enabled(os.getenv("VERCEL"))


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
        bind = session.get_bind()
        migration_engine = getattr(bind, "engine", bind)
        run_sqlite_migrations(migration_engine)
        seed_reference_data(session)
    logger.info("Database schema ensured and seeded.")


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Initialize database and seed reference data once on startup."""
    if should_skip_startup_db_init():
        logger.info("Skipping startup database initialization for serverless runtime.")
    else:
        init_database()
        with SessionLocal() as session:
            # Opt-in bootstrap for first-admin creation (safe-by-default; disabled unless env flag is set).
            maybe_bootstrap_admin_on_startup(session)
    yield


app = FastAPI(title=settings.app_name, openapi_tags=tags_metadata, lifespan=lifespan)


@app.exception_handler(ResponseValidationError)
async def response_validation_exception_handler(
    request: Request,
    exc: ResponseValidationError,
) -> JSONResponse:
    logger.error(
        "Response validation failed for path=%s error_count=%s.",
        request.url.path,
        len(exc.errors()),
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal response validation error."},
    )

# Single CORS middleware to allow the SPA to call all API routes, including preflight.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_origin_regex=settings.allowed_origin_regex,
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
