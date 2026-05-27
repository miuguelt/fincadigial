#!/usr/bin/env python3
"""Seed mínimo para desarrollo — NO crear en producción.

Solo crea un usuario bootstrap sin finca asignada.
El primer usuario debe crear su propia finca durante el onboarding.

Uso: python seed_bootstrap.py
"""

import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models.user import User, Role, ApprovalStatus


def seed_bootstrap():
    app = create_app()
    with app.app_context():
        admin = User.query.filter_by(email="admin@villaluz.com").first()
        if admin:
            print("✅ Usuario bootstrap ya existe: admin@villaluz.com")
            return

        User.create(
            identification=10000000,
            fullname="Administrador",
            email="admin@villaluz.com",
            password="admin123",
            phone="3000000000",
            role=Role.Administrador,
            finca_id=1,
            status=True,
            approval_status=ApprovalStatus.Approved,
        )
        db.session.commit()
        print("✅ Usuario bootstrap creado: admin@villaluz.com / admin123")
        print("⚠️  Este usuario requiere finca_id=1. Ejecuta seed_parametric.py primero.")


if __name__ == "__main__":
    seed_bootstrap()
