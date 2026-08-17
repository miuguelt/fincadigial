from app import db
from app.models.user import User, Role
from app.models.finca import Finca, FarmType
from app.models.user_finca import UserFinca
from app.utils.seed_identities import get_seed_identities
import logging
import os
import secrets

logger = logging.getLogger("startup")


def ensure_test_users():
    """Garantiza usuarios de prueba mediante descongestión de identificadores únicos."""
    try:
        # 1. Asegurar Finca
        finca = Finca.query.first()
        if not finca:
            finca = Finca(
                name="Villa Luz", type=FarmType.Tradicional, department="Colombia"
            )
            db.session.add(finca)
            db.session.commit()

        # 2. Leer .env
        admin_password = (
            os.getenv("ADMIN_PASSWORD")
            or os.getenv("TEST_USER_PASSWORD")
            or secrets.token_urlsafe(24)
        )
        if not os.getenv("ADMIN_PASSWORD") and not os.getenv("TEST_USER_PASSWORD"):
            logger.warning(
                "Usuarios de prueba creados con contraseña efímera; define ADMIN_PASSWORD para acceso manual."
            )
        # Identidades tomadas de la tabla canónica compartida con los scripts de apoyo.
        target_creds = [
            {
                "id": profile["identification"],
                "email": profile["email"],
                "name": profile["fullname"],
                "role": Role[profile["role"]],
                "pwd": admin_password,
            }
            for profile in get_seed_identities()
        ]

        # FASE 1: Limpieza de conflictos (ID o Email duplicados con valores incorrectos)
        for c in target_creds:
            # Buscar usuarios que usen el ID o Email objetivo pero que no sean el usuario correcto
            # Eliminamos los conflictos para permitir la creación/sincronización limpia
            conflicts = User.query.filter(
                ((User.identification == c["id"]) & (User.email != c["email"]))
                | ((User.email == c["email"]) & (User.identification != c["id"]))
            ).all()

            for conflict in conflicts:
                logger.info(
                    f"🗑️ Eliminando conflicto de identidad (ID:{conflict.identification}, Email:{conflict.email}) para asegurar {c['email']}"
                )
                # La relación no tiene cascada: sin borrar las membresías, el DELETE
                # intenta dejar user_finca.user_id en NULL y aborta toda la siembra.
                UserFinca.query.filter_by(user_id=conflict.id).delete(
                    synchronize_session=False
                )
                db.session.delete(conflict)

        db.session.commit()  # Consolidar limpieza antes de sincronizar

        # FASE 2: Sincronización Final
        for c in target_creds:
            user = User.query.filter_by(identification=c["id"]).first()
            if not user:
                user = User.query.filter_by(email=c["email"]).first()

            if user:
                user.identification = c["id"]
                user.email = c["email"]
                user.fullname = c["name"]
                user.role = c["role"]
                user.finca_id = finca.id
                user.status = True
                user.approval_status = "Approved"
                user.set_password(c["pwd"])
                logger.info(f"✅ Usuario sincronizado: {c['email']} (ID: {c['id']})")
            else:
                user = User(
                    identification=c["id"],
                    email=c["email"],
                    fullname=c["name"],
                    role=c["role"],
                    finca_id=finca.id,
                    phone=f"300{c['id'] % 10000000:07d}",
                    status=True,
                    approval_status="Approved",
                )
                user.set_password(c["pwd"])
                db.session.add(user)
                logger.info(f"👤 Usuario creado: {c['email']} (ID: {c['id']})")

        db.session.commit()
        logger.info("🚀 Ecosistema de identidades estabilizado mediante descongestión.")

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error en descongestión de identidades: {e}")
