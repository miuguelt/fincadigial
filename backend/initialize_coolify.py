"""Inicializa una instalación Coolify después de aplicar las migraciones."""

import logging

from app import create_app, db
from app.models.breeds import Breeds
from app.models.diseases import Diseases
from app.models.fields import Fields
from app.models.foodTypes import FoodTypes
from app.models.finca import Finca
from app.models.knowledge_base import KBCalendario, KBRecomendacion
from app.models.route_administration import RouteAdministration
from app.models.species import Species
from app.models.system_content import SystemContent
from app.models.territory import Territory
from app.models.user import User
from app.utils.seed_master import run_master_seed
from seed_coolify import ensure_coolify_admin
from seed_parametric import run_parametric_seed

logger = logging.getLogger(__name__)

REQUIRED_COUNTS = {
    "fincas": (Finca, 1),
    "usuarios": (User, 1),
    "especies": (Species, 1),
    "razas": (Breeds, 1),
    "rutas de administración": (RouteAdministration, 1),
    "enfermedades": (Diseases, 1),
    "territorios": (Territory, 1),
    "tipos de alimento": (FoodTypes, 1),
    "potreros": (Fields, 1),
    "contenidos del sistema": (SystemContent, 1),
    "recomendaciones de conocimiento": (KBRecomendacion, 1),
    "calendario sanitario": (KBCalendario, 1),
}


def verify_required_data() -> None:
    """Falla el despliegue si faltan datos mínimos para el primer uso."""
    missing = [
        f"{name} (mínimo {minimum}, actual {model.query.count()})"
        for name, (model, minimum) in REQUIRED_COUNTS.items()
        if model.query.count() < minimum
    ]
    if missing:
        raise RuntimeError("Datos básicos incompletos: " + "; ".join(missing))


def initialize() -> None:
    """Ejecuta seeds idempotentes y valida la instalación resultante."""
    app = create_app("production")
    with app.app_context():
        run_parametric_seed()
        run_master_seed()
        created = ensure_coolify_admin()
        db.session.commit()
        verify_required_data()
        logger.info("Inicialización Coolify completa. Administrador creado: %s", created)


if __name__ == "__main__":
    initialize()
