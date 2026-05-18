import sys
sys.path.append('.')
from app import create_app, db
from sqlalchemy import text

app = create_app('development')
with app.app_context():
    # Obtener valores del enum alertpriority en Postgres
    try:
        result = db.session.execute(text("SELECT enumlabel FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE pg_type.typname = 'alertpriority';")).fetchall()
        print("Valores del enum alertpriority en DB:", [r[0] for r in result])
    except Exception as e:
        print("Error al consultar enum:", str(e))
