import requests
import json

URL = "http://127.0.0.1:8092/api/v1/auth/login"
PAYLOAD = {
    "identification": "1098",
    "password": "12345678"
}

print(f"Enviando login a {URL}...")
try:
    response = requests.post(URL, json=PAYLOAD)
    print(f"Status Code: {response.status_code}")
    print("Response JSON:")
    print(json.dumps(response.json(), indent=2))
except Exception as e:
    print(f"Error: {e}")
