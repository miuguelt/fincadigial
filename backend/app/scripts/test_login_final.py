import os

import requests

url = "http://127.0.0.1:5000/api/v1/auth/login"
identifier = os.getenv("VILLALUZ_E2E_ADMIN_ID") or os.getenv("E2E_ADMIN_ID")
password = os.getenv("VILLALUZ_E2E_ADMIN_PASSWORD") or os.getenv("E2E_ADMIN_PASS")
if not identifier or not password:
    raise SystemExit(
        "Configure VILLALUZ_E2E_ADMIN_ID and VILLALUZ_E2E_ADMIN_PASSWORD before running this script."
    )
payload = {"identification": identifier, "password": password}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"STATUS CODE: {response.status_code}")
    print(f"RESPONSE: {response.text}")
except Exception as e:
    print(f"ERROR: {e}")
