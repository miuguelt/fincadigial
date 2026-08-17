import os
import logging

logger = logging.getLogger(__name__)


def init_db_protector(app, db):
    """
    Inicializa protecciones proactivas para la base de datos.
    Intercepta métodos destructivos para evitar accidentes en producción.
    """

    flask_env = os.getenv("FLASK_ENV", "development").lower()
    original_drop_all = db.drop_all
    original_create_all = db.create_all

    def safe_drop_all(*args, **kwargs):
        # Bloqueo estricto en producción o si no hay bypass explícito
        allow_destruction = (
            os.getenv("ALLOW_DATABASE_DESTRUCTION", "false").lower() == "true"
        )

        if flask_env == "production" and not allow_destruction:
            msg = "☢️ BLOQUEO DE SEGURIDAD: Intento de ejecutar db.drop_all() en PRODUCCIÓN denegado."
            logger.critical(msg)
            raise RuntimeError(msg)

        if not allow_destruction and flask_env != "testing":
            # En desarrollo también protegemos a menos que se pida explícitamente
            # (las pruebas automatizadas sí suelen necesitarlo en su DB transitoria)
            logger.warning(
                "Protector interceptó drop_all en modo seguro (no-producción)."
            )

        return original_drop_all(*args, **kwargs)

    def safe_create_all(*args, **kwargs):
        force_create = os.getenv("FORCE_DB_CREATE", "false").lower() == "true"

        if flask_env == "production" and not force_create:
            # db.create_all es menos peligroso pero en producción preferimos migraciones
            logger.info(
                "Protector: db.create_all() omitido en producción (use migraciones)."
            )
            return

        return original_create_all(*args, **kwargs)

    # Monkey-patching de los métodos de la instancia de SQLAlchemy
    db.drop_all = safe_drop_all
    db.create_all = safe_create_all

    app.logger.info(f"🛡️ DB Protector activo (Entorno: {flask_env})")
