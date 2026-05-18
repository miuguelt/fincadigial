import sys
sys.path.append('.')
from app import create_app, db
from sqlalchemy import text

app = create_app('development')
with app.app_context():
    try:
        # Añadir recommendation (si no existe)
        try:
            db.session.execute(text("ALTER TABLE animal_alerts ADD COLUMN recommendation TEXT"))
            print("Columna recommendation añadida.")
        except Exception as e:
            print("recommendation ya existe o error:", str(e))
            db.session.rollback()
            
        # Añadir priority (si no existe)
        try:
            db.session.execute(text("ALTER TABLE animal_alerts ADD COLUMN priority VARCHAR(20) DEFAULT 'Media'"))
            print("Columna priority añadida.")
        except Exception as e:
            print("priority ya existe o error:", str(e))
            db.session.rollback()
            
        db.session.commit()
        print("Migración de animal_alerts completada.")
    except Exception as e:
        print("Error global:", str(e))
