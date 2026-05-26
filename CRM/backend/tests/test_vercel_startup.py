from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def test_vercel_entrypoint_import_does_not_connect_to_database_on_import() -> None:
    backend_root = Path(__file__).resolve().parents[1]
    env = {
        **os.environ,
        "DPM_ENV": "production",
        "JWT_SECRET": "StrongProductionSecret123!",
        "ALLOWED_ORIGINS": "https://dopamine-crm-suite-playground.pages.dev",
        "ALLOW_DEV_TOKEN_ENDPOINT": "false",
        "ALLOW_DEV_TOKEN": "false",
        "DATABASE_URL": "postgresql://user:pass@127.0.0.1:1/defaultdb",
        "VERCEL": "1",
    }

    result = subprocess.run(
        [sys.executable, "-c", "from api.index import app; print(bool(app))"],
        cwd=backend_root,
        env=env,
        check=False,
        capture_output=True,
        text=True,
        timeout=15,
    )

    assert result.returncode == 0, result.stderr
    assert "True" in result.stdout
