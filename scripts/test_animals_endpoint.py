#!/usr/bin/env python3
"""Prueba específica del endpoint de animals con JWT"""

import requests
import json

BASE_URL = "http://localhost:8181/api/v1"
HEADERS = {"Content-Type": "application/json"}

def login():
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        headers=HEADERS,
        json={"identifier": "1098", "password": "Admin1234!"}
    )
    data = resp.json()
    if data.get("success"):
        return data["data"]["access_token"], data["data"]["user"]
    return None, None

def test_animals(token):
    headers = {**HEADERS, "Authorization": f"Bearer {token}"}
    resp = requests.get(f"{BASE_URL}/animals", headers=headers)
    print(f"Status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        animals = data.get("data", [])
        print(f"Animales encontrados: {len(animals)}")
        if animals:
            print(f"Primer animal: ID={animals[0].get('id')}, finca_id={animals[0].get('finca_id')}")
    else:
        print(f"Error: {resp.text[:500]}")
    return resp.status_code == 200

if __name__ == "__main__":
    token, user = login()
    if token:
        print(f"Login OK - Usuario: {user['fullname']}, finca_id: {user.get('finca_id')}")
        test_animals(token)
    else:
        print("Login falló")
