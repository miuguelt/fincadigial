import sys, traceback
sys.path.append('.')
from app import create_app, db
from flask_jwt_extended import create_access_token

# Parchear SQLAlchemy para capturar el PRIMER error
import sqlalchemy.engine.base as sa_base
orig_exec = sa_base.Connection._execute_context

def patched_exec(self, dialect, constructor, statement, parameters, execution_options, *args, **kwargs):
    try:
        return orig_exec(self, dialect, constructor, statement, parameters, execution_options, *args, **kwargs)
    except Exception as e:
        print('=== PRIMER ERROR SQL ===')
        print('SQL:', str(statement)[:500])
        print('ERROR:', str(e)[:500])
        print('TRACEBACK:')
        traceback.print_exc()
        print('========================')
        raise

sa_base.Connection._execute_context = patched_exec

app = create_app('development')
with app.app_context():
    token = create_access_token(identity='1')
    client = app.test_client()
    res = client.get('/api/v1/animals?autoFetch=true', headers={'Authorization': f'Bearer {token}'})
    print(f'autoFetch=true -> {res.status_code}')
