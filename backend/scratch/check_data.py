from app import create_app
from app.extensions import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    print("--- Auditoría de Datos Villa Luz ---")
    
    # 1. Alertas de Sistema (AnimalAlert)
    try:
        alerts_count = db.session.execute(text('SELECT count(*) FROM animal_alerts')).scalar()
        print(f"Total Alertas Sistema (animal_alerts): {alerts_count}")
    except Exception as e:
        db.session.rollback()
        print(f"Error consultando animal_alerts: {e}")

    # 2. Reglas de Alertas (AnimalAlertConfig)
    try:
        rules_count = db.session.execute(text('SELECT count(*) FROM animal_alert_configs')).scalar()
        print(f"Total Reglas de Alertas (animal_alert_configs): {rules_count}")
    except Exception as e:
        db.session.rollback()
        print(f"Error consultando animal_alert_configs: {e}")

    # 3. Animales
    try:
        animals_count = db.session.execute(text('SELECT count(*) FROM animals')).scalar()
        print(f"Total Animales: {animals_count}")
    except Exception as e:
        db.session.rollback()
        print(f"Error consultando animals: {e}")

    # 4. Fincas
    try:
        fincas_count = db.session.execute(text('SELECT count(*) FROM finca')).scalar()
        print(f"Total Fincas (finca): {fincas_count}")
    except Exception as e:
        db.session.rollback()
        print(f"Error consultando finca: {e}")
