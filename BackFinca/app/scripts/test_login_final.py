import requests

url = "http://127.0.0.1:5000/api/v1/auth/login"
payload = {"identification": "1098", "password": "12345678"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"STATUS CODE: {response.status_code}")
    print(f"RESPONSE: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")
