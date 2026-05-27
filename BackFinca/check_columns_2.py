import sys
sys.path.append('.')
from app import create_app, db
from sqlalchemy import text

app = create_app('development')
with app.app_context():
    result = db.session.execute(text("SELECT table_catalog, table_schema, column_name FROM information_schema.columns WHERE table_name='animal_alerts';")).fetchall()
    for r in result:
        print(r)
    # let's try to query it directly
    try:
        db.session.execute(text("SELECT priority FROM animal_alerts LIMIT 1"))
        print("Successfully queried priority!")
    except Exception as e:
        print("Failed to query priority:", str(e))
