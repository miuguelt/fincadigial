"""
Migración 002: Agregar tabla user_finca (Multi-Finca)
=====================================================

Crea la tabla user_finca para permitir que un usuario pertenezca
a múltiples fincas con diferentes roles.

Uso:
    cd BackFinca
    python docs/migrations/002_add_user_finca.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app import create_app, db
from sqlalchemy import text
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def upgrade():
    """Crear tabla user_finca y migrar datos existentes."""
    logger.info("Iniciando migración 002: Multi-Finca Support")

    # Crear tabla user_finca
    create_table_sql = """
    CREATE TABLE IF NOT EXISTS user_finca (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        finca_id INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'Operario',
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        is_primary BOOLEAN DEFAULT FALSE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
        FOREIGN KEY (finca_id) REFERENCES finca(id) ON DELETE CASCADE,
        UNIQUE(user_id, finca_id)
    );
    """

    # Crear índices
    create_indexes_sql = [
        "CREATE INDEX IF NOT EXISTS ix_user_finca_user_id ON user_finca(user_id);",
        "CREATE INDEX IF NOT EXISTS ix_user_finca_finca_id ON user_finca(finca_id);",
        "CREATE INDEX IF NOT EXISTS ix_user_finca_is_active ON user_finca(is_active);",
        "CREATE INDEX IF NOT EXISTS ix_user_finca_is_primary ON user_finca(is_primary);",
    ]

    try:
        # Ejecutar SQL de creación
        db.session.execute(text(create_table_sql))
        logger.info("✓ Tabla user_finca creada")

        for sql in create_indexes_sql:
            db.session.execute(text(sql))
        logger.info("✓ Índices creados")

        # Migrar datos existentes: crear relaciones para usuarios actuales
        migrate_data_sql = """
        INSERT INTO user_finca (user_id, finca_id, role, is_active, is_primary, created_at)
        SELECT
            u.id as user_id,
            u.finca_id,
            u.role as role,
            u.status as is_active,
            TRUE as is_primary,
            u.created_at
        FROM user u
        WHERE u.finca_id IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM user_finca uf
            WHERE uf.user_id = u.id AND uf.finca_id = u.finca_id
        );
        """

        result = db.session.execute(text(migrate_data_sql))
        logger.info(f"✓ Datos migrados: {result.rowcount} relaciones creadas")

        db.session.commit()
        logger.info("✅ Migración 002 completada exitosamente")

    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error en migración: {e}")
        raise


def downgrade():
    """Eliminar tabla user_finca."""
    logger.info("Revirtiendo migración 002")

    try:
        db.session.execute(text("DROP TABLE IF EXISTS user_finca;"))
        db.session.commit()
        logger.info("✅ Tabla user_finca eliminada")
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error al revertir: {e}")
        raise


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Migración 002: Multi-Finca')
    parser.add_argument('--downgrade', action='store_true', help='Revertir migración')
    args = parser.parse_args()

    app = create_app()

    with app.app_context():
        if args.downgrade:
            downgrade()
        else:
            upgrade()
