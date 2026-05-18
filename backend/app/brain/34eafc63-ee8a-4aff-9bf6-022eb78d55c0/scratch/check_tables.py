from app import create_app, db
from sqlalchemy import inspect
app = create_app()
with app.app_context():
    i = inspect(db.engine)
    print("Tables in DB:", i.get_table_names())
    for table in ['offspring', 'reproductive_events']:
        try:
            cols = i.get_columns(table)
            print(f"Columns in '{table}': {[c['name'] for c in cols]}")
        except Exception as e:
            print(f"Error inspecting '{table}': {e}")
