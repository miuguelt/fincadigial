"""
Migración Multi-Tenant _projects/villaluz
================================
Fase 1: Agrega soporte multi-finca al sistema

Tablas modificadas (16 tablas tenant):
- user, animals, fields, food_types
- inventory_lots, inventory_movements
- animal_alerts, animal_alert_configs
- activity_log, activity_daily_agg
- control, treatments, vaccinations
- genetic_improvements, reproductive_events, offspring
- animal_diseases, animal_images, animal_fields

Cambios en constraints:
- animals.record: UNIQUE global → UNIQUE (record, finca_id)

Ejecución: python docs/migrations/001_add_multi_tenant.py
"""

import sys
import os

# Agregar BackFinca al path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..'))

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from app import create_app, db

# Configuración
TENANT_TABLES = [
    'user',
    'animals',
    'fields',
    'food_types',
    'inventory_lots',
    'inventory_movements',
    'animal_alerts',
    'animal_alert_configs',
    'activity_log',
    'activity_daily_agg',
    'control',
    'treatments',
    'vaccinations',
    'genetic_improvements',
    'reproductive_events',
    'offspring',
    'animal_diseases',
    'animal_images',
    'animal_fields',
]


def check_finca_exists(conn):
    """Verificar si la tabla finca existe y tiene registros."""
    try:
        result = conn.execute(text("SELECT COUNT(*) as count FROM finca"))
        return result.fetchone()[0] > 0
    except SQLAlchemyError:
        return False


def create_default_finca(conn):
    """Crear finca default Villa Luz si no existe."""
    print("🌾 Creando finca default 'Villa Luz'...")
    try:
        # Verificar si ya existe
        result = conn.execute(text("SELECT id FROM finca WHERE id = 1"))
        if result.fetchone():
            print("   ℹ️ Finca default ya existe (ID: 1)")
            return True

        # Insertar si no existe
        conn.execute(text("""
            INSERT INTO finca (id, name, type, is_active, created_at, updated_at)
            VALUES (1, 'Villa Luz', 'Educativa', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        """))
        conn.commit()
        print("   ✅ Finca default creada (ID: 1)")
        return True
    except SQLAlchemyError as e:
        print(f"   ❌ Error creando finca default: {e}")
        conn.rollback()
        return False


def add_finca_column(conn, table_name):
    """Agregar columna finca_id a una tabla."""
    print(f"   📋 Procesando tabla: {table_name}...")

    try:
        # Detectar si es SQLite
        is_sqlite = conn.dialect.name == 'sqlite'

        # 1. Verificar si la columna ya existe
        if is_sqlite:
            # SQLite: usar PRAGMA table_info
            result = conn.execute(text(f"PRAGMA table_info({table_name})"))
            columns = [row[1] for row in result.fetchall()]
            if 'finca_id' in columns:
                print(f"      ℹ️ Columna finca_id ya existe en {table_name}")
                return True
        else:
            # MySQL: usar information_schema
            result = conn.execute(text(f"""
                SELECT COUNT(*) as count FROM information_schema.columns
                WHERE table_name = '{table_name}' AND column_name = 'finca_id'
            """))
            if result.fetchone()[0] > 0:
                print(f"      ℹ️ Columna finca_id ya existe en {table_name}")
                return True

        # 2. Agregar columna nullable primero
        if is_sqlite:
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN finca_id INTEGER"))
        else:
            conn.execute(text(f"""
                ALTER TABLE {table_name}
                ADD COLUMN finca_id INT NULL,
                ADD INDEX idx_{table_name}_finca_id (finca_id)
            """))

        # 3. Actualizar registros existentes
        conn.execute(text(f"UPDATE {table_name} SET finca_id = 1"))

        # 4. Hacer NOT NULL (SQLite no soporta esto directamente, se maneja a nivel de app)
        if not is_sqlite:
            conn.execute(text(f"""
                ALTER TABLE {table_name}
                MODIFY finca_id INT NOT NULL
            """))

        # 5. Agregar Foreign Key (SQLite no soporta ALTER TABLE ADD CONSTRAINT)
        if not is_sqlite:
            conn.execute(text(f"""
                ALTER TABLE {table_name}
                ADD CONSTRAINT fk_{table_name}_finca
                FOREIGN KEY (finca_id) REFERENCES finca(id)
                ON DELETE RESTRICT ON UPDATE CASCADE
            """))

        conn.commit()
        print(f"      ✅ Tabla {table_name} actualizada")
        return True

    except SQLAlchemyError as e:
        print(f"      ❌ Error en {table_name}: {e}")
        conn.rollback()
        return False


def fix_animals_unique_constraint(conn):
    """Cambiar unique constraint de animals.record a (record, finca_id)."""
    print("🔧 Corrigiendo unicidad de animals.record...")

    try:
        is_sqlite = conn.dialect.name == 'sqlite'

        if is_sqlite:
            # SQLite: recrear tabla con nuevo constraint
            print("   ℹ️ SQLite detectado - unicidad manejada a nivel de aplicación")
            return True

        # Verificar constraint existente
        result = conn.execute(text("""
            SELECT CONSTRAINT_NAME FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_NAME = 'animals' AND CONSTRAINT_TYPE = 'UNIQUE'
            AND CONSTRAINT_NAME LIKE '%record%'
        """))

        existing_constraints = [row[0] for row in result.fetchall()]

        # Eliminar constraints existentes sobre record
        for constraint in existing_constraints:
            try:
                conn.execute(text(f"""
                    ALTER TABLE animals DROP INDEX {constraint}
                """))
                print(f"   ✅ Constraint {constraint} eliminado")
            except SQLAlchemyError as e:
                print(f"   ⚠️ No se pudo eliminar {constraint}: {e}")

        # Crear nuevo constraint compuesto
        conn.execute(text("""
            ALTER TABLE animals
            ADD UNIQUE INDEX uq_animals_record_finca (record, finca_id)
        """))

        conn.commit()
        print("   ✅ Unicidad (record, finca_id) creada")
        return True

    except SQLAlchemyError as e:
        print(f"   ❌ Error: {e}")
        conn.rollback()
        return False


def add_user_finca_foreign_key(conn):
    """Agregar FK de user a finca."""
    print("🔗 Agregando FK de user a finca...")

    try:
        is_sqlite = conn.dialect.name == 'sqlite'

        if is_sqlite:
            # SQLite: FK manejada a nivel de modelo SQLAlchemy
            print("   ℹ️ SQLite detectado - FK manejada a nivel de modelo")
            return True

        # Verificar si ya existe
        result = conn.execute(text("""
            SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS
            WHERE TABLE_NAME = 'user' AND CONSTRAINT_NAME = 'fk_user_finca'
        """))

        if result.fetchone()[0] > 0:
            print("   ℹ️ FK ya existe")
            return True

        conn.execute(text("""
            ALTER TABLE user
            ADD CONSTRAINT fk_user_finca
            FOREIGN KEY (finca_id) REFERENCES finca(id)
            ON DELETE RESTRICT ON UPDATE CASCADE
        """))

        conn.commit()
        print("   ✅ FK user → finca creada")
        return True

    except SQLAlchemyError as e:
        print(f"   ❌ Error: {e}")
        conn.rollback()
        return False


def upgrade():
    """Ejecutar migración completa."""
    print("=" * 60)
    print("MIGRACIÓN MULTI-TENANT _projects/villaluz")
    print("=" * 60)

    app = create_app()

    with app.app_context():
        # Crear todas las tablas primero
        print("📦 Creando tablas de la base de datos...")
        db.create_all()
        print("   ✅ Tablas creadas")

        engine = db.engine
        conn = engine.connect()

        try:
            # 1. Verificar/crear finca default
            if not check_finca_exists(conn):
                if not create_default_finca(conn):
                    print("\n❌ No se pudo crear finca default. Abortando.")
                    return False
            else:
                print("🌾 Finca default ya existe")

            # 2. Agregar finca_id a tablas tenant
            print(f"\n📊 Agregando finca_id a {len(TENANT_TABLES)} tablas...")
            success_count = 0
            for table in TENANT_TABLES:
                if add_finca_column(conn, table):
                    success_count += 1

            print(f"\n   ✅ {success_count}/{len(TENANT_TABLES)} tablas actualizadas")

            # 3. Corregir unicidad de animals
            fix_animals_unique_constraint(conn)

            # 4. Agregar FK de user a finca
            add_user_finca_foreign_key(conn)

            print("\n" + "=" * 60)
            print("✅ MIGRACIÓN COMPLETADA")
            print("=" * 60)
            print("\nResumen:")
            print("  • Finca default 'Villa Luz' (ID: 1) verificada")
            print(f"  • {success_count} tablas con columna finca_id")
            print("  • Unicidad animals.record → (record, finca_id)")
            print("  • Foreign Keys creadas")
            print("\nPróximos pasos:")
            print("  1. Actualizar modelo User con nuevos roles (Fase 2)")
            print("  2. Actualizar JWT claims con finca_id (Fase 2)")
            print("  3. Implementar TenantMiddleware (Fase 2)")

            return True

        except Exception as e:
            print(f"\n❌ Error en migración: {e}")
            conn.rollback()
            return False
        finally:
            conn.close()


def downgrade():
    """Reversar migración (para rollback)."""
    print("⚠️ DOWNGRADE no implementado - hacer backup manual")
    return False


if __name__ == '__main__':
    import argparse

    parser = argparse.ArgumentParser(description='Migración Multi-Tenant')
    parser.add_argument('--downgrade', action='store_true', help='Reversar migración')
    args = parser.parse_args()

    if args.downgrade:
        downgrade()
    else:
        upgrade()

