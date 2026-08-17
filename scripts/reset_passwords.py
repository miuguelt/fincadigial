#!/usr/bin/env python3
"""
Script para resetear contraseñas de los usuarios Operario y Veterinario.

Los documentos salen de la tabla canónica `app.utils.seed_identities`; antes
estaban escritos a mano y apuntaban a Propietario y Capataz, así que el reseteo
caía sobre el usuario equivocado.
"""

import sys
import os

# Agregar el backend al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import create_app, db
from app.models.user import User
from app.utils.seed_identities import get_seed_identity

from test_credentials import get_role_password


FIELD_ROLES = ("Operario", "Veterinario")


def reset_role_password(role):
    """Reescribe la contraseña del usuario canónico del rol. Devuelve si lo encontró."""
    profile = get_seed_identity(role)
    user = User.query.filter_by(identification=profile["identification"]).first()
    if not user:
        print(f"❌ {role} no encontrado (documento {profile['identification']})")
        return False

    user.set_password(get_role_password(role))
    db.session.commit()
    print(f"✓ Contraseña reseteada para {role}: {user.fullname}")
    return True


def reset_passwords():
    """Resetear contraseñas de Operario y Veterinario"""
    app = create_app()

    with app.app_context():
        try:
            for role in FIELD_ROLES:
                reset_role_password(role)

            print("\n✅ Contraseñas reseteadas exitosamente")
            print("\nDocumentos para pruebas (la contraseña sale del entorno):")
            for role in FIELD_ROLES:
                print(f"  {role}: {get_seed_identity(role)['identification']}")

        except Exception as e:
            print(f"❌ Error reseteando contraseñas: {e}")
            import traceback

            traceback.print_exc()
            db.session.rollback()
            return 1

        return 0


if __name__ == "__main__":
    sys.exit(reset_passwords())
