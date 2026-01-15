from __future__ import annotations

import logging
from typing import Iterable

from sqlalchemy import text
from sqlalchemy.engine import Engine

logger = logging.getLogger(__name__)


def _get_sqlite_columns(conn, table_name: str) -> Iterable[str]:
    """Return column names for a SQLite table."""
    result = conn.execute(text(f"PRAGMA table_info('{table_name}')"))
    return [row[1] for row in result]


def _ensure_visits_is_deleted(engine: Engine) -> None:
    """Add visits.is_deleted if missing (SQLite only)."""
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        columns = _get_sqlite_columns(conn, "visits")
        if not columns:
            logger.info("visits table not found; skipping is_deleted migration.")
            return

        if "is_deleted" in columns:
            return

        logger.info("Adding visits.is_deleted column (INTEGER NOT NULL DEFAULT 0).")
        conn.execute(
            text("ALTER TABLE visits ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0")
        )


def _rebuild_visits_table(conn) -> None:
    logger.warning("Rebuilding visits table to align with new schema.")
    existing_columns = _get_sqlite_columns(conn, "visits")

    conn.execute(text("ALTER TABLE visits RENAME TO visits_old"))

    conn.execute(
        text(
            """
            CREATE TABLE visits (
                id INTEGER PRIMARY KEY,
                visit_date DATE NOT NULL,
                planned_at DATETIME,
                rep_id INTEGER NOT NULL,
                doctor_id INTEGER,
                pharmacy_id INTEGER,
                notes TEXT,
                samples_given TEXT,
                next_action TEXT,
                next_action_date DATE,
                status TEXT NOT NULL DEFAULT 'SCHEDULED',
                started_at DATETIME,
                ended_at DATETIME,
                start_lat FLOAT,
                start_lng FLOAT,
                start_accuracy FLOAT,
                start_device_info TEXT,
                end_lat FLOAT,
                end_lng FLOAT,
                end_accuracy FLOAT,
                end_device_info TEXT,
                duration_seconds INTEGER,
                override_reason TEXT,
                did_samples INTEGER NOT NULL DEFAULT 0,
                did_brochure INTEGER NOT NULL DEFAULT 0,
                did_collection INTEGER NOT NULL DEFAULT 0,
                did_order INTEGER NOT NULL DEFAULT 0,
                is_deleted INTEGER NOT NULL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY(rep_id) REFERENCES users(id),
                FOREIGN KEY(doctor_id) REFERENCES doctors(id),
                FOREIGN KEY(pharmacy_id) REFERENCES pharmacies(id),
                CHECK (
                    (doctor_id IS NOT NULL AND pharmacy_id IS NULL) OR
                    (pharmacy_id IS NOT NULL AND doctor_id IS NULL)
                )
            )
            """
        )
    )

    def _select_column(name: str, default: str = "NULL") -> str:
        if name in existing_columns:
            return name
        return default

    conn.execute(
        text(
            f"""
            INSERT INTO visits (
                id,
                visit_date,
                planned_at,
                rep_id,
                doctor_id,
                pharmacy_id,
                notes,
                samples_given,
                next_action,
                next_action_date,
                status,
                started_at,
                ended_at,
                start_lat,
                start_lng,
                start_accuracy,
                start_device_info,
                end_lat,
                end_lng,
                end_accuracy,
                end_device_info,
                duration_seconds,
                override_reason,
                did_samples,
                did_brochure,
                did_collection,
                did_order,
                is_deleted,
                created_at,
                updated_at
            )
            SELECT
                {_select_column("id")},
                {_select_column("visit_date")},
                {_select_column("planned_at")},
                {_select_column("rep_id")},
                {_select_column("doctor_id")},
                {_select_column("pharmacy_id")},
                {_select_column("notes")},
                {_select_column("samples_given")},
                {_select_column("next_action")},
                {_select_column("next_action_date")},
                CASE
                    WHEN status = 'scheduled' THEN 'SCHEDULED'
                    WHEN status = 'in_progress' THEN 'IN_PROGRESS'
                    WHEN status = 'completed' THEN 'COMPLETED'
                    WHEN status IN ('cancelled', 'canceled') THEN 'CANCELED'
                    WHEN status = 'no_show' THEN 'NO_SHOW'
                    ELSE status
                END,
                {_select_column("started_at")},
                {_select_column("ended_at")},
                {_select_column("start_lat")},
                {_select_column("start_lng")},
                {_select_column("start_accuracy")},
                {_select_column("start_device_info")},
                {_select_column("end_lat")},
                {_select_column("end_lng")},
                {_select_column("end_accuracy")},
                {_select_column("end_device_info")},
                {_select_column("duration_seconds")},
                {_select_column("override_reason")},
                COALESCE({_select_column("did_samples", "0")}, 0),
                COALESCE({_select_column("did_brochure", "0")}, 0),
                COALESCE({_select_column("did_collection", "0")}, 0),
                COALESCE({_select_column("did_order", "0")}, 0),
                COALESCE({_select_column("is_deleted", "0")}, 0),
                {_select_column("created_at", "CURRENT_TIMESTAMP")},
                {_select_column("updated_at", "CURRENT_TIMESTAMP")}
            FROM visits_old
            """
        )
    )

    conn.execute(text("DROP TABLE visits_old"))


def _ensure_visits_columns(engine: Engine) -> None:
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        columns = _get_sqlite_columns(conn, "visits")
        if not columns:
            logger.info("visits table not found; skipping column migrations.")
            return

        if "planned_at" not in columns:
            conn.execute(text("ALTER TABLE visits ADD COLUMN planned_at DATETIME"))
        if "override_reason" not in columns:
            conn.execute(text("ALTER TABLE visits ADD COLUMN override_reason TEXT"))
        if "did_samples" not in columns:
            conn.execute(text("ALTER TABLE visits ADD COLUMN did_samples INTEGER NOT NULL DEFAULT 0"))
        if "did_brochure" not in columns:
            conn.execute(text("ALTER TABLE visits ADD COLUMN did_brochure INTEGER NOT NULL DEFAULT 0"))
        if "did_collection" not in columns:
            conn.execute(text("ALTER TABLE visits ADD COLUMN did_collection INTEGER NOT NULL DEFAULT 0"))
        if "did_order" not in columns:
            conn.execute(text("ALTER TABLE visits ADD COLUMN did_order INTEGER NOT NULL DEFAULT 0"))
        if "start_device_info" not in columns:
            conn.execute(text("ALTER TABLE visits ADD COLUMN start_device_info TEXT"))
        if "end_device_info" not in columns:
            conn.execute(text("ALTER TABLE visits ADD COLUMN end_device_info TEXT"))

        if "status" in columns:
            try:
                conn.execute(
                    text(
                        "UPDATE visits SET status = "
                        "CASE "
                        "WHEN status = 'scheduled' THEN 'SCHEDULED' "
                        "WHEN status = 'in_progress' THEN 'IN_PROGRESS' "
                        "WHEN status = 'completed' THEN 'COMPLETED' "
                        "WHEN status IN ('cancelled', 'canceled') THEN 'CANCELED' "
                        "WHEN status = 'no_show' THEN 'NO_SHOW' "
                        "ELSE status END"
                    )
                )
            except Exception:  # noqa: BLE001
                _rebuild_visits_table(conn)


def _ensure_tracking_tables(engine: Engine) -> None:
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS devices (
                    id INTEGER PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    platform VARCHAR(50) NOT NULL,
                    device_label VARCHAR(150),
                    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    last_seen_at DATETIME,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
                """
            )
        )
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS location_events (
                    id INTEGER PRIMARY KEY,
                    device_id INTEGER NOT NULL,
                    ts DATETIME NOT NULL,
                    lat FLOAT NOT NULL,
                    lng FLOAT NOT NULL,
                    accuracy_m FLOAT,
                    distance_m FLOAT,
                    gap_seconds FLOAT,
                    speed_kmh FLOAT,
                    suspicious_jump INTEGER NOT NULL DEFAULT 0,
                    tamper_flags TEXT,
                    source VARCHAR(50),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    FOREIGN KEY(device_id) REFERENCES devices(id)
                )
                """
            )
        )

        columns = _get_sqlite_columns(conn, "location_events")
        if "distance_m" not in columns:
            conn.execute(text("ALTER TABLE location_events ADD COLUMN distance_m FLOAT"))
        if "gap_seconds" not in columns:
            conn.execute(text("ALTER TABLE location_events ADD COLUMN gap_seconds FLOAT"))
        if "speed_kmh" not in columns:
            conn.execute(text("ALTER TABLE location_events ADD COLUMN speed_kmh FLOAT"))
        if "suspicious_jump" not in columns:
            conn.execute(text("ALTER TABLE location_events ADD COLUMN suspicious_jump INTEGER NOT NULL DEFAULT 0"))
        if "tamper_flags" not in columns:
            conn.execute(text("ALTER TABLE location_events ADD COLUMN tamper_flags TEXT"))


def _ensure_telemetry_table(engine: Engine) -> None:
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS telemetry_locations (
                    id INTEGER PRIMARY KEY,
                    rep_id INTEGER NOT NULL,
                    lat FLOAT NOT NULL,
                    lng FLOAT NOT NULL,
                    accuracy_m FLOAT,
                    speed_mps FLOAT,
                    bearing_deg FLOAT,
                    ts DATETIME NOT NULL,
                    device_info TEXT,
                    source VARCHAR(50),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    FOREIGN KEY(rep_id) REFERENCES users(id)
                )
                """
            )
        )

        columns = _get_sqlite_columns(conn, "telemetry_locations")
        if "accuracy_m" not in columns:
            conn.execute(text("ALTER TABLE telemetry_locations ADD COLUMN accuracy_m FLOAT"))
        if "speed_mps" not in columns:
            conn.execute(text("ALTER TABLE telemetry_locations ADD COLUMN speed_mps FLOAT"))
        if "bearing_deg" not in columns:
            conn.execute(text("ALTER TABLE telemetry_locations ADD COLUMN bearing_deg FLOAT"))
        if "device_info" not in columns:
            conn.execute(text("ALTER TABLE telemetry_locations ADD COLUMN device_info TEXT"))
        if "source" not in columns:
            conn.execute(text("ALTER TABLE telemetry_locations ADD COLUMN source VARCHAR(50)"))


def _ensure_visit_targets_table(engine: Engine) -> None:
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS visit_targets (
                    id INTEGER PRIMARY KEY,
                    rep_id INTEGER NOT NULL,
                    period VARCHAR(20) NOT NULL,
                    daily_target_visits INTEGER NOT NULL,
                    monthly_target_visits INTEGER NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    FOREIGN KEY(rep_id) REFERENCES users(id),
                    UNIQUE(rep_id, period)
                )
                """
            )
        )


def _ensure_visit_attachments_table(engine: Engine) -> None:
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS visit_attachments (
                    id INTEGER PRIMARY KEY,
                    visit_id INTEGER NOT NULL,
                    filename VARCHAR(255) NOT NULL,
                    content_type VARCHAR(100),
                    file_path VARCHAR(500) NOT NULL,
                    size_bytes INTEGER,
                    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                    FOREIGN KEY(visit_id) REFERENCES visits(id)
                )
                """
    )            
        )


def _ensure_products_is_active(engine: Engine) -> None:
    if engine.url.get_backend_name() != "sqlite":
        return

    with engine.begin() as conn:
        columns = _get_sqlite_columns(conn, "products")
        if not columns:
            logger.info("products table not found; skipping is_active migration.")
            return
        if "is_active" in columns:
            return
        logger.info("Adding products.is_active column (INTEGER NOT NULL DEFAULT 1).")
        conn.execute(text("ALTER TABLE products ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"))


def run_sqlite_migrations(engine: Engine) -> None:
    """
    Run lightweight SQLite migrations to keep schema aligned with models.
    Safe to execute on every startup.
    """
    _ensure_visits_is_deleted(engine)
    _ensure_visits_columns(engine)
    _ensure_tracking_tables(engine)
    _ensure_telemetry_table(engine)
    _ensure_visit_targets_table(engine)
    _ensure_visit_attachments_table(engine)
    _ensure_products_is_active(engine)
