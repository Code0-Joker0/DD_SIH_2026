import sys
import importlib.util
from pathlib import Path

# Load backend/app.py file module
_app_file = Path(__file__).parent.parent / "app.py"
if _app_file.exists():
    _spec = importlib.util.spec_from_file_location("backend_app_main", str(_app_file))
    _mod = importlib.util.module_from_spec(_spec)
    _spec.loader.exec_module(_mod)
    if hasattr(_mod, "app"):
        app = _mod.app
