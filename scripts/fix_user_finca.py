#!/usr/bin/env python3
"""
Script para mover usuarios Operario y Veterinario a una finca Tradicional
"""

import sys
import os

# Agregar el backend al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import create_app, db
from app.models.user import User


def fix_user_finca():
    """Mover usuarios Operario y Veterinario a finca Tradicional"""
    app = create_app()

    with app.app_context():
        try:
            # Mover Operario a finca Tradicional (ID 3)
            operario = User.query.filter_by(identification=55555555).first()
            if operario:
                operario.finca_id = 3  # Finca A - Tradicional
                db.session.commit()
                print(f"✓ Operario movido a finca ID 3 (Tradicional): {operario.fullname}")
            else:
                print("❌ Operario no encontrado")

            # Mover Veterinario a finca Tradicional (ID 3)
            veterinario = User.query.filter_by(identification=66666666).first()
            if veterinario:
                veterinario.finca_id = 3  # Finca A - Tradicional
                db.session.commit()
                print(f"✓ Veterinario movido a finca ID 3 (Tradicional): {veterinario.fullname}")
            else:
                print("❌ Veterinario no encontrado")

            print("\n✅ Usuarios movidos a finca Tradicional exitosamente")
            print("\nCredenciales para pruebas:")
            print("  Operario:    55555555 / contraseña definida por E2E_WORKER_PASS (Finca ID 3)")
            print("  Veterinario: 66666666 / contraseña definida por E2E_VET_PASS (Finca ID 3)")

        except Exception as e:
            print(f"❌ Error moviendo usuarios: {e}")
            import traceback

            traceback.print_exc()
            db.session.rollback()
            return 1

        return 0


if __name__ == "__main__":
    sys.exit(fix_user_finca())
