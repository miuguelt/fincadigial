import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from sqlalchemy import text

app = create_app()
with app.app_context():
    # Encontrar especies que tengan razas
    result = db.session.execute(text("SELECT species_id, COUNT(*) FROM breeds GROUP BY species_id")).fetchall()
    print("Conteo de razas por especie:")
    for row in result:
        print(f" - Especie ID {row[0]}: {row[1]} razas")
        
        # Probar query de muestras para esta especie
        try:
            samples_query = text("SELECT id, name FROM breeds WHERE species_id = :record_id LIMIT 5")
            rows = db.session.execute(samples_query, {'record_id': row[0]}).fetchall()
            print("   Muestras:")
            for r in rows:
                print(f"     * ID: {r[0]}, Name: {r[1]}")
        except Exception as e:
            print(f"   Error: {e}")
