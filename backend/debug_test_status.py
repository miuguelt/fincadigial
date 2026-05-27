"""Debug script to test the /api/v1/animals?limit=100&status=Vivo endpoint."""
import sys
sys.path.insert(0, ".")
from app import create_app
from app.api import register_api
import flask

app = create_app("testing")
register_api(app)
client = app.test_client()

with app.app_context():
    from app.models.users import User
    user = User.query.first()
    print(f"User: {user.email if user else "None"}")

# Login
resp = client.post("/api/v1/auth/login", json={
    "email": "admin@test.com",
    "password": "admin123"
})
print(f"Login status: {resp.status_code}")
body = resp.get_json()
print(f"Login body: {body}")

token = None
if body and isinstance(body, dict):
    data = body.get("data", body)
    if isinstance(data, dict):
        token = data.get("access_token")
    if not token:
        token = body.get("access_token")

print(f"Token: {token is not None}")

if token:
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: basic list
    resp1 = client.get("/api/v1/animals", headers=headers)
    print(f"\nTest 1 - GET /api/v1/animals")
    print(f"  Status: {resp1.status_code}")
    
    # Test 2: with status filter
    resp2 = client.get("/api/v1/animals?status=Vivo", headers=headers)
    print(f"\nTest 2 - GET /api/v1/animals?status=Vivo")
    print(f"  Status: {resp2.status_code}")
    if resp2.status_code != 200:
        print(f"  Response: {resp2.get_json()}")
    else:
        print(f"  Success: {resp2.get_json().get("success")}")
    
    # Test 3: with limit (exact user report)
    resp3 = client.get("/api/v1/animals?limit=100&status=Vivo", headers=headers)
    print(f"\nTest 3 - GET /api/v1/animals?limit=100&status=Vivo")
    print(f"  Status: {resp3.status_code}")
    if resp3.status_code != 200:
        body3 = resp3.get_json()
        print(f"  Response: {body3}")
        if isinstance(body3, dict):
            print(f"  Error details: {body3.get("details", body3.get("error", "N/A"))}")
    else:
        body3 = resp3.get_json()
        print(f"  Success: {body3.get("success")}")
        data = body3.get("data", [])
        print(f"  Items count: {len(data)}")
        if data:
            print(f"  First item status: {data[0].get("status", "N/A")}")
else:
    print("No token obtained")
