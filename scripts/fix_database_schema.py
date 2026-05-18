#!/usr/bin/env python3
"""
Script para actualizar el esquema de la base de datos SQLite
Agrega columnas faltantes en la tabla animals
"""

import sys
sys.path.insert(0, 'BackFinca')

from app import create_app, db
from sqlalchemy import text

def migrate_animals_table():
    """Agrega columnas regulatorias faltantes a la tabla animals"""
    app = create_app()
    
    with app.app_context():
        # Columnas a agregar
        columns_to_add = [
            ('entry_date', 'DATE'),
            ('purchase_date', 'DATE'),
            ('sale_date', 'DATE'),
            ('exit_date', 'DATE'),
            ('exit_reason', 'VARCHAR(255)'),
        ]
        
        for col_name, col_type in columns_to_add:
            try:
                # Verificar si la columna ya existe
                db.session.execute(text(f"SELECT {col_name} FROM animals LIMIT 1"))
                print(f"  Columna '{col_name}' ya existe, omitiendo.")
            except Exception:
                # Agregar columna
                try:
                    db.session.execute(text(f"ALTER TABLE animals ADD COLUMN {col_name} {col_type}"))
                    db.session.commit()
                    print(f"  ✓ Columna '{col_name}' agregada.")
                except Exception as e:
                    print(f"  ✗ Error agregando '{col_name}': {e}")
        
        print("\nMigración completada.")
        
        # Verificar estructura actual
        result = db.session.execute(text("PRAGMA table_info(animals)"))
        columns = result.fetchall()
        print(f"\nEstructura actual de 'animals' ({len(columns)} columnas):")
        for col in columns:
            print(f"  - {col[1]}: {col[2]}")

if __name__ == "__main__":
    migrate_animals_table()
