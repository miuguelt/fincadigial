"""
Migración 003: Agregar tabla push_subscription (Web Push)
==========================================================

Crea la tabla para almacenar suscripciones Web Push de usuarios.

Uso:
    cd VillaLuz
    python docs/migrations/003_add_push_subscriptions.py

Dependencias:
    pip install pywebpush py-vapid
"""

import sys
import os

sys.path.insert(
    0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)

from app import create_app, db
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def upgrade():
    """Crear tabla push_subscription."""
    logger.info("Iniciando migración 003: Push Subscriptions")

    create_table_sql = """
    CREATE TABLE IF NOT EXISTS push_subscription (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        endpoint VARCHAR(500) NOT NULL,
        p256dh VARCHAR(200) NOT NULL,
        auth VARCHAR(100) NOT NULL,
        user_agent VARCHAR(500),
        platform VARCHAR(50),
        browser VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
        UNIQUE(endpoint)
    );
    """

    create_indexes_sql = [
        "CREATE INDEX IF NOT EXISTS ix_push_subscription_user_id ON push_subscription(user_id);",
        "CREATE INDEX IF NOT EXISTS ix_push_subscription_endpoint ON push_subscription(endpoint);",
        "CREATE INDEX IF NOT EXISTS ix_push_subscription_is_active ON push_subscription(is_active);",
    ]

    try:
        db.session.execute(text(create_table_sql))
        logger.info("✓ Tabla push_subscription creada")

        for sql in create_indexes_sql:
            db.session.execute(text(sql))
        logger.info("✓ Índices creados")

        db.session.commit()
        logger.info("✅ Migración 003 completada exitosamente")

        logger.info("\n⚠️ IMPORTANTE:")
        logger.info(
            "Para habilitar notificaciones push, configura las variables de entorno:"
        )
        logger.info("  VAPID_PUBLIC_KEY=tu_clave_publica")
        logger.info("  VAPID_PRIVATE_KEY=tu_clave_privada")
        logger.info("  VAPID_CLAIMS_SUB=mailto:admin@fincavillaluz.com")
        logger.info("\nGenera las claves con:")
        logger.info(
            '  python -c "from vapid import Vapid; v=Vapid(); v.generate_keys(); print(v.public_key()); print(v.private_key())"'
        )

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error en migración: {e}")
        raise


def downgrade():
    """Eliminar tabla push_subscription."""
    logger.info("Revirtiendo migración 003")

    try:
        db.session.execute(text("DROP TABLE IF EXISTS push_subscription;"))
        db.session.commit()
        logger.info("✅ Tabla push_subscription eliminada")
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error al revertir: {e}")
        raise


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Migración 003: Push Subscriptions")
    parser.add_argument("--downgrade", action="store_true", help="Revertir migración")
    args = parser.parse_args()

    app = create_app()

    with app.app_context():
        if args.downgrade:
            downgrade()
        else:
            upgrade()
