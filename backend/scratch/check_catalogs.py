from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    catalogs = ['breeds', 'species', 'food_types', 'medications', 'vaccines', 'diseases']
    print("--- Auditoría de Catálogos ---")
    for table in catalogs:
        try:
            count = db.session.execute(text(f'SELECT count(*) FROM {table}')).scalar()
            print(f"{table}: {count}")
        except Exception as e:
            db.session.rollback()
            print(f"Error en {table}: {e}")
