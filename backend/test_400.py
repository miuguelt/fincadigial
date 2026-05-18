import sys
sys.path.append('.')
from app import create_app, db
from flask_jwt_extended import create_access_token

app = create_app('development')
with app.app_context():
    token = create_access_token(identity='1')
    client = app.test_client()
    res = client.get('/api/v1/animals?autoFetch=true', headers={'Authorization': f'Bearer {token}'})
    print(f'autoFetch=true -> {res.status_code} - {res.data.decode("utf-8")}')
    res2 = client.get('/api/v1/animals?page=1&limit=100&fields=id,record,sex,gender&sex=Hembra&sort=created_at&sort_dir=desc', headers={'Authorization': f'Bearer {token}'})
    print(f'Complex query -> {res2.status_code} - {res2.data.decode("utf-8")}')
