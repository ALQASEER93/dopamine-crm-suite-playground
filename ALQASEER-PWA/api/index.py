from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "CRM" / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

try:
    from main import app as fastapi_app  # noqa: E402
except Exception as exc:
    print(f"Failed to import FastAPI app from {BACKEND_DIR}: {exc}")
    raise

app = fastapi_app
