#!/usr/bin/env python3
"""Seed completo para despliegues en Coolify.
Incluye los datos paramétricos (catálogos) y el administrador principal.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models.user import User, Role, ApprovalStatus
from app.models.finca import Finca, FarmType
from seed_parametric import run_parametric_seed

def ensure_coolify_admin() -> bool:
    """Crea el administrador inicial sin modificar usuarios existentes."""
    admin_email = "admin@villaluz.com"
    if User.query.filter_by(email=admin_email).first():
        return False

    finca = Finca.query.order_by(Finca.id).first()
    if not finca:
        finca = Finca(
            name="Finca Principal",
            type=FarmType.Tradicional,
            department="Por Definir",
            municipality="Por Definir",
            is_active=True,
        )
        db.session.add(finca)
        db.session.flush()

    admin = User(
        identification=1234567890,
        fullname="Administrador Principal",
        email=admin_email,
        phone="3000000000",
        role=Role.Administrador,
        finca_id=finca.id,
        status=True,
        approval_status=ApprovalStatus.Approved,
    )
    admin_password = os.getenv("COOLIFY_ADMIN_PASSWORD")
    if not admin_password:
        raise RuntimeError("COOLIFY_ADMIN_PASSWORD es obligatorio para crear el administrador inicial")
    admin.set_password(admin_password)
    db.session.add(admin)
    db.session.commit()
    return True


def seed_coolify() -> None:
    """Compatibilidad para ejecuciones manuales del seed de producción."""
    app = create_app(os.getenv("FLASK_ENV", "production"))
    with app.app_context():
        run_parametric_seed()
        ensure_coolify_admin()

if __name__ == "__main__":
    seed_coolify()
