import sys
import os

# Agregar directorio backend al path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db

app = create_app()
with app.app_context():
    print("Tablas en db.metadata.tables:")
    for table_name in sorted(db.metadata.tables.keys()):
        print(f" - {table_name}")
        table = db.metadata.tables[table_name]
        print(f"   Columnas: {[c.name for c in table.columns]}")
