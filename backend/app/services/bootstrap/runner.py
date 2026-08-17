"""Orquestador único del bootstrap de una instalación."""

from __future__ import annotations

from app.models.finca import Finca
from .config import BootstrapSettings, load_bootstrap_settings
from .demo import seed_demo_data
from .farms import ensure_admin, ensure_farms
from .finca import seed_all_finca_baselines
from .system import seed_global_baseline


def run_database_bootstrap(settings: BootstrapSettings | None = None) -> dict:
    """Ejecuta semillas globales, por finca y, opcionalmente, fixtures.

    No elimina registros y todas las operaciones son idempotentes. Las tablas
    de auditoría, sincronización, push y mensajería se dejan al flujo real.
    """

    settings = settings or load_bootstrap_settings()
    if not settings.enabled:
        return {"status": "skipped", "reason": "VILLALUZ_BOOTSTRAP_ENABLED=false"}

    report = {"status": "completed"}
    report["global"] = seed_global_baseline()
    ensure_farms(settings.farms)
    all_farms = Finca.query.order_by(Finca.id).all()
    admin = ensure_admin(settings, all_farms)
    report["admin_id"] = admin.id
    report["finca"] = seed_all_finca_baselines()
    if settings.include_demo_data:
        report["demo"] = seed_demo_data(settings)
    return report
