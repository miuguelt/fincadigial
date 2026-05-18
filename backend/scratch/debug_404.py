import requests
import json

# Obtener token
url_login = "http://127.0.0.1:8092/api/v1/auth/login"
payload_login = {"identifier": "1098", "password": "12345678"}
resp_login = requests.post(url_login, json=payload_login)
print(f"Login Status: {resp_login.status_code}")
print(f"Login Body: {resp_login.text}")
token = resp_login.json()['data']['access_token']

headers = {"Authorization": f"Bearer {token}"}

# Test animals GET list (to get an ID)
resp_list = requests.get("http://127.0.0.1:8092/api/v1/animals", headers=headers)
animals = resp_list.json().get('data', [])
if not animals:
    print("No animals found, creating one...")
    payload_create = {
        "record": "DEBUG-ANIMAL",
        "sex": "Macho",
        "birth_date": "2024-01-01",
        "weight": 100,
        "breeds_id": 1,
        "finca_id": 2
    }
    resp_create = requests.post("http://127.0.0.1:8092/api/v1/animals", headers=headers, json=payload_create)
    print(f"Create Status: {resp_create.status_code}")
    print(f"Create Body: {resp_create.text}")
    if resp_create.status_code in (200, 201):
        animal_id = resp_create.json()['data']['id']
    else:
        animal_id = None
else:
    animal_id = animals[0]['id']

if animal_id:
    print(f"Testing animal ID: {animal_id}")
    
    # Test GET detail
    resp_get = requests.get(f"http://127.0.0.1:8092/api/v1/animals/{animal_id}", headers=headers)
    print(f"GET Detail Status: {resp_get.status_code}")
    print(f"GET Detail Body: {resp_get.text}")
    
    # Test PUT detail
    resp_put = requests.put(f"http://127.0.0.1:8092/api/v1/animals/{animal_id}", headers=headers, json={"record": "TEST-UPDATED"})
    print(f"PUT Detail Status: {resp_put.status_code}")
    print(f"PUT Detail Body: {resp_put.text}")
else:
    print("No animals found")
