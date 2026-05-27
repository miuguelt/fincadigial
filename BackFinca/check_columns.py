import sys
sys.path.append('.')
from app import create_app, db
from sqlalchemy import text

app = create_app('development')
with app.app_context():
    result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name='animal_alerts';")).fetchall()
    print("Columns in animal_alerts:", [r[0] for r in result])
