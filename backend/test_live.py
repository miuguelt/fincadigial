import jwt
import urllib.request
import urllib.parse
import datetime

secret = '4e9c7a2b8f3d1e6c9a0b5d8f2e1a4c7b9d0e8f3a1c6b2d5a7f9e0b2d4a6c8e1f'
token = jwt.encode({'sub': '1', 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=1)}, secret, algorithm='HS256')

url = 'http://127.0.0.1:8092/api/v1/animals?page=1&limit=100&fields=id,record,sex,gender&sex=Hembra&sort=created_at&sort_dir=desc'
req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})

try:
    with urllib.request.urlopen(req) as response:
        print('SUCCESS:', response.read().decode())
except urllib.error.HTTPError as e:
    print('ERROR CODE:', e.code)
    print('ERROR BODY:', e.read().decode())
