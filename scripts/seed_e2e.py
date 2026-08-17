"""Siembra los usuarios E2E con las identidades canónicas del seeder.

Antes esta lista repetía documentos y correos a mano con el dominio
`@villaluz.com`, mientras el seeder de arranque usa `@villaluz.co`: cada arranque
del backend borraba estos usuarios por conflicto de correo.
"""

import os
import sys

# Añadir ruta del backend al path
backend_path = os.path.join(os.getcwd(), "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app import create_app, db
from app.models.user import User, ApprovalStatus
from app.models.finca import Finca, FarmType
from app.utils.seed_identities import get_seed_identities

from test_credentials import get_role_password


def ensure_e2e_finca():
    """Devuelve la finca 1 de pruebas E2E, creándola si no existe."""
    finca = Finca.query.get(1)
    if finca:
        return finca

    finca = Finca(
        id=1,
        name="Villa Luz - E2E",
        type=FarmType.Educativa,
        department="Antioquia",
        municipality="Medellín",
    )
    db.session.add(finca)
    db.session.commit()
    print("✓ Finca 1 creada")
    return finca


def seed_e2e_users():
    app = create_app("development")

    with app.app_context():
        db.create_all()
        print("🌱 Seeding E2E Test Users...")

        finca = ensure_e2e_finca()

        for profile in get_seed_identities():
            role = profile["role"]
            user = User.query.filter_by(identification=profile["identification"]).first()
            if user:
                print(f"✓ Usuario ya existe: {user.fullname} ({role})")
                continue

            # User.create maneja set_password y UserFinca.assign automáticamente
            User.create(
                identification=profile["identification"],
                fullname=profile["fullname"],
                email=profile["email"],
                phone=f"300{profile['identification'] % 10000000:07d}",
                role=role,
                password=get_role_password(role),
                finca_id=finca.id,
                status=True,
                approval_status=ApprovalStatus.Approved,
                commit=True,
            )
            print(f"✓ Usuario creado: {profile['fullname']} ({role})")

        print("✅ E2E Seed Complete")


if __name__ == "__main__":
    seed_e2e_users()
