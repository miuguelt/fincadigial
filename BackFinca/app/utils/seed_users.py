from app import db
from app.models.user import User, Role
from app.models.finca import Finca, FarmType
import logging
import os

logger = logging.getLogger('startup')

def ensure_test_users():
    """Garantiza usuarios de prueba mediante descongestión de identificadores únicos."""
    try:
        # 1. Asegurar Finca
        finca = Finca.query.first()
        if not finca:
            finca = Finca(name="Villa Luz", type=FarmType.Tradicional, department="Colombia")
            db.session.add(finca)
            db.session.commit()

        # 2. Leer .env
        admin_password = os.getenv('ADMIN_PASSWORD', '12345678')
        admin_email = os.getenv('ADMIN_EMAIL', 'admin@villaluz.co')
        admin_id = int(os.getenv('ADMIN_ID', '1098'))

        target_creds = [
            {"id": admin_id, "email": admin_email, "name": "Administrador General", "role": Role.Administrador, "pwd": admin_password},
            {"id": int(os.getenv('TEST_USER_PROPRIETARIO_ID', '55555555')), "email": "propietario@villaluz.co", "name": "Don Carlos Dueño", "role": Role.Propietario, "pwd": admin_password},
            {"id": int(os.getenv('TEST_USER_CAPATAZ_ID', '66666666')), "email": "capataz@villaluz.co", "name": "Capataz Pedro", "role": Role.Capataz, "pwd": admin_password},
            {"id": int(os.getenv('TEST_USER_INSTRUCTOR_ID', '11111111')), "email": "instructor@sena.edu.co", "name": "Instructor Jefe", "role": Role.Instructor, "pwd": admin_password},
            {"id": int(os.getenv('TEST_USER_APRENDIZ_ID', '22222222')), "email": "aprendiz@sena.edu.co", "name": "Aprendiz SENA 1", "role": Role.Aprendiz, "pwd": admin_password},
            {"id": int(os.getenv('TEST_USER_OPERARIO_ID', '33333333')), "email": "operario@villaluz.co", "name": "María Operaria", "role": Role.Operario, "pwd": admin_password},
            {"id": int(os.getenv('TEST_USER_VETERINARIO_ID', '44444444')), "email": "veterinario@villaluz.co", "name": "Dr. Martínez Vet", "role": Role.Veterinario, "pwd": admin_password},
        ]

        # FASE 1: Limpieza de conflictos (ID o Email duplicados con valores incorrectos)
        for c in target_creds:
            # Buscar usuarios que usen el ID o Email objetivo pero que no sean el usuario correcto
            # Eliminamos los conflictos para permitir la creación/sincronización limpia
            conflicts = User.query.filter(
                ((User.identification == c["id"]) & (User.email != c["email"])) |
                ((User.email == c["email"]) & (User.identification != c["id"]))
            ).all()

            for conflict in conflicts:
                logger.info(f"🗑️ Eliminando conflicto de identidad (ID:{conflict.identification}, Email:{conflict.email}) para asegurar {c['email']}")
                db.session.delete(conflict)

        db.session.commit() # Consolidar limpieza antes de sincronizar

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
                user.approval_status = 'Approved'
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
                    approval_status='Approved'
                )
                user.set_password(c["pwd"])
                db.session.add(user)
                logger.info(f"👤 Usuario creado: {c['email']} (ID: {c['id']})")

        db.session.commit()
        logger.info("🚀 Ecosistema de identidades estabilizado mediante descongestión.")

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error en descongestión de identidades: {e}")
