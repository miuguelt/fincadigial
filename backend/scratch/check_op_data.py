from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    tables = [
        'reproductive_events', 
        'sinigan_registrations', 
        'tasks', 
        'milk_production', 
        'transactions'
    ]
    print("--- Auditoría de Operación Villa Luz ---")
    for table in tables:
        try:
            count = db.session.execute(text(f'SELECT count(*) FROM {table}')).scalar()
            print(f"{table}: {count}")
        except Exception as e:
            db.session.rollback()
            print(f"Error en {table}: {e}")
