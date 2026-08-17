"""Limpieza segura de fincas de prueba.
Uso: python scripts/cleanup_test_data.py
Muestra las fincas a eliminar sin --force. Con --force las marca is_deleted=true.
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app("development")
FORCE = "--force" in sys.argv


def find_test_fincas():
    with app.app_context():
        rows = db.session.execute(
            text("""
            SELECT id, name, is_deleted,
                (SELECT COUNT(*) FROM animals WHERE finca_id = f.id AND is_deleted = false) as animal_count
            FROM finca f
            WHERE f.name LIKE '%Test%' OR f.name LIKE '%Final%'
               OR f.name ~ 'TestFinal'
            ORDER BY f.id
        """)
        ).fetchall()
    return rows


def main():
    test_fincas = find_test_fincas()
    if not test_fincas:
        print("  No se encontraron fincas de prueba.")
        return

    print("Fincas de prueba detectadas:\n")
    for f in test_fincas:
        print(f"  ID {f[0]:3} | {str(f[1]):35} | animales={f[2]:5} | ya_eliminada={bool(f[3])}")

    total_animals = sum(f[2] for f in test_fincas)
    print(f"\n  Total: {len(test_fincas)} fincas, {total_animals} animales asociados")

    if not FORCE:
        print("\n  Modo vista previa. Ejecuta con --force para eliminar.")
        return

    with app.app_context():
        for f in test_fincas:
            fid = f[0]
            db.session.execute(
                text(f"""
                UPDATE finca SET is_deleted = true, deleted_at = NOW()
                WHERE id = {fid}
            """)
            )
            db.session.execute(
                text(f"""
                UPDATE animals SET is_deleted = true, deleted_at = NOW()
                WHERE finca_id = {fid}
            """)
            )
            print(f"  🗑️  Finca {fid} ({str(f[1])[:30]}) marcada como eliminada")
        db.session.commit()
        print("\n✅ Datos de prueba eliminados (soft delete)")


if __name__ == "__main__":
    main()
