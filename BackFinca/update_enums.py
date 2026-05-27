import sys
sys.path.append('.')
from app import create_app, db
from sqlalchemy import text

app = create_app('development')
with app.app_context():
    try:
        # Renombrar labels de alertpriority
        db.session.execute(text("ALTER TYPE alertpriority RENAME VALUE 'LOW' TO 'Baja';"))
        db.session.execute(text("ALTER TYPE alertpriority RENAME VALUE 'MEDIUM' TO 'Media';"))
        db.session.execute(text("ALTER TYPE alertpriority RENAME VALUE 'HIGH' TO 'Alta';"))
        db.session.execute(text("ALTER TYPE alertpriority RENAME VALUE 'CRITICAL' TO 'Crítica';"))

        # Renombrar labels de alerttype
        db.session.execute(text("ALTER TYPE alerttype RENAME VALUE 'REPRODUCTION' TO 'Reproducción';"))
        db.session.execute(text("ALTER TYPE alerttype RENAME VALUE 'HEALTH' TO 'Salud';"))
        db.session.execute(text("ALTER TYPE alerttype RENAME VALUE 'GROWTH' TO 'Crecimiento';"))
        db.session.execute(text("ALTER TYPE alerttype RENAME VALUE 'STATUS' TO 'Estado';"))
        db.session.execute(text("ALTER TYPE alerttype RENAME VALUE 'PRODUCTION' TO 'Producción';"))
        db.session.execute(text("ALTER TYPE alerttype RENAME VALUE 'CUSTOM' TO 'Personalizada';"))
        db.session.execute(text("ALTER TYPE alerttype RENAME VALUE 'PREDICTIVE' TO 'Predictiva';"))

        db.session.commit()
        print("Enums de PostgreSQL actualizados a Español.")
    except Exception as e:
        db.session.rollback()
        print("Error al actualizar enums:", str(e))
