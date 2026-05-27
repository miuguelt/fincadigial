from app import create_app, db
from sqlalchemy import inspect
app = create_app()
with app.app_context():
    i = inspect(db.engine)
    tables = ['offspring', 'reproductive_events', 'inventory_movements', 'inventory_lots']
    for table in tables:
        print(f"Columns in '{table}': {[c['name'] for c in i.get_columns(table)]}")
