#!/usr/bin/env python3
import requests
import json

print("=" * 50)
print("CHECK OLLAMA STATUS")
print("=" * 50)

try:
    resp = requests.get('http://127.0.0.1:11434/api/tags', timeout=5)
    print(f"Status: {resp.status_code}")
    data = resp.json()
    models = data.get('models', [])
    print(f"Modelos disponibles: {len(models)}")
    for m in models[:5]:
        print(f"  - {m.get('name', 'unknown')}")
except Exception as e:
    print(f"Error: {e}")
