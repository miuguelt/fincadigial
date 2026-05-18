from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    print("--- Verificando Secuencias RouteAdministration ---")
    try:
        # 1. Ver datos actuales
        rows = db.session.execute(text('SELECT id, name FROM route_administrations')).fetchall()
        print(f"Filas actuales: {rows}")
        
        # 2. Resetear secuencia (PostgreSQL)
        db.session.execute(text("SELECT setval('route_administrations_id_seq', (SELECT MAX(id) FROM route_administrations))"))
        print("Secuencia reseteada con éxito.")
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error: {e}")
