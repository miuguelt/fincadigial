#!/usr/bin/env python3
"""Verificación final del sistema Villa Luz"""
import requests
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

print('='*70)
print('VERIFICACIÓN FINAL DEL SISTEMA')
print('='*70)

# 1. Health
r = requests.get('http://127.0.0.1:8092/api/v1/health', verify=False, timeout=10)
health_ok = r.json().get('success')
print(f'\n1. Backend Health: {"✅ HEALTHY" if health_ok else "❌"}')

# 2. Frontend
r = requests.get('https://127.0.0.1:3003', verify=False, timeout=10)
frontend_ok = r.status_code == 200
print(f'2. Frontend: {"✅ Online" if frontend_ok else "❌"}')

# 3. Auth
r = requests.post('http://127.0.0.1:8092/api/v1/auth/login',
    json={'identification': 1098, 'password': '12345678'},
    verify=False, timeout=10)
auth_ok = r.status_code == 200
print(f'3. Auth: {"✅ Working" if auth_ok else "❌"}')

# 4. CRUD
if auth_ok:
    token = r.json()['data']['access_token']
    headers = {'Authorization': f'Bearer {token}'}

    endpoints = ['/fincas', '/animals', '/users', '/tasks']
    print('4. CRUD Endpoints:')
    all_ok = True
    for ep in endpoints:
        r = requests.get(f'http://127.0.0.1:8092/api/v1{ep}', headers=headers, verify=False, timeout=5)
        ok = r.status_code == 200
        status = '✅' if ok else '❌'
        print(f'   {status} {ep}')
        if not ok:
            all_ok = False

print('\n' + '='*70)
if health_ok and frontend_ok and auth_ok and all_ok:
    print('SISTEMA: ✅ 100% OPERATIVO')
else:
    print('SISTEMA: ⚠️ REVISAR PROBLEMAS')
print('='*70)
