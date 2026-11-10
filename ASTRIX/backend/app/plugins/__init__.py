import importlib
import pkgutil
from fastapi import FastAPI

def load_plugins(app: FastAPI):
    """
    Round 2 Plugin Loader:
    Discovers all python modules in this directory and automatically mounts:
    - `router` if the module exports an APIRouter
    - `register(app)` if the module exports a setup function
    """
    for m in pkgutil.iter_modules(__path__):
        try:
            mod = importlib.import_module(f"{__name__}.{m.name}")
            if hasattr(mod, "router"):
                app.include_router(mod.router)
            if hasattr(mod, "register"):
                mod.register(app)
        except Exception as e:
            print(f"[Plugin Warning] Failed to load plugin {m.name}: {e}")
