#!/usr/bin/env python3
"""
Script para crear usuarios de prueba de campo (Operario y Veterinario) si faltan.

Los documentos y correos salen de la tabla canónica `app.utils.seed_identities`,
la misma que usa el seeder de arranque. Inventar aquí otro documento hace que el
siguiente arranque del backend borre al usuario por conflicto de identidad.
"""

import sys
import os

# Agregar el backend al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import create_app, db
from app.models.user import User, ApprovalStatus
from app.models.finca import Finca, FarmType
from app.utils.seed_identities import get_seed_identity

from test_credentials import get_role_password


FIELD_ROLES = ("Operario", "Veterinario")


def ensure_test_finca():
    """Devuelve la finca de prueba (id=1), creándola si no existe."""
    finca = Finca.query.filter_by(id=1).first()
    if finca:
        return finca

    print("❌ Finca de prueba (id=1) no encontrada. Creando...")
    finca = Finca(
        name="Finca de Prueba",
        type=FarmType.Tradicional,
        department="Antioquia",
        municipality="Medellín",
        is_active=True,
    )
    db.session.add(finca)
    db.session.commit()
    print(f"✓ Finca creada: {finca.name} (id={finca.id})")
    return finca


def ensure_user(role, finca_id):
    """Crea el usuario canónico del rol si falta. `User.create` asigna la UserFinca."""
    profile = get_seed_identity(role)
    existing = User.query.filter_by(identification=profile["identification"]).first()
    if existing:
        print(f"✓ {role} ya existe: {existing.fullname} ({profile['identification']})")
        return existing

    print(f"Creando usuario {role}...")
    user = User.create(
        identification=profile["identification"],
        fullname=profile["fullname"],
        email=profile["email"],
        phone=f"300{profile['identification'] % 10000000:07d}",
        role=role,
        password=get_role_password(role),
        finca_id=finca_id,
        status=True,
        approval_status=ApprovalStatus.Approved,
        commit=True,
    )
    print(f"✓ {role} creado: {user.fullname} (id={user.id}, documento={user.identification})")
    return user


def create_test_users():
    """Crear usuarios de prueba para Operario y Veterinario"""
    app = create_app()

    with app.app_context():
        try:
            finca = ensure_test_finca()
            for role in FIELD_ROLES:
                ensure_user(role, finca.id)

            print("\n✅ Usuarios de prueba creados exitosamente")
            print("\nDocumentos para pruebas (la contraseña sale del entorno):")
            for role in FIELD_ROLES:
                print(f"  {role}: {get_seed_identity(role)['identification']}")

        except Exception as e:
            print(f"❌ Error creando usuarios: {e}")
            import traceback

            traceback.print_exc()
            db.session.rollback()
            return 1

        return 0


if __name__ == "__main__":
    sys.exit(create_test_users())
