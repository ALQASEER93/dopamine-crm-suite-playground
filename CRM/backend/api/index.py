from pathlib import Path
import sys


backend_root = Path(__file__).resolve().parents[1]
if str(backend_root) not in sys.path:
    sys.path.insert(0, str(backend_root))

from main import app  # noqa: E402,F401
