from app import create_app, db
from sqlalchemy import text

app = create_app('development')
with app.app_context():
    print("Altering animal_alerts.message to TEXT...")
    db.session.execute(text("ALTER TABLE animal_alerts ALTER COLUMN message TYPE TEXT"))
    print("Altering animal_alert_configs.message to TEXT...")
    db.session.execute(text("ALTER TABLE animal_alert_configs ALTER COLUMN message TYPE TEXT"))
    db.session.commit()
    print("Columns altered successfully.")
