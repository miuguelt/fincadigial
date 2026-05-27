#!/usr/bin/env python3
"""Test CRUD completo - URLs corregidas"""
import requests

BASE_URL = 'http://127.0.0.1:8092/api/v1'
TOKEN = open('test_token.txt').read().strip()
HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# URLs corregidas según namespaces registrados
ENTITIES = [
    # ✅ Funcionan
    ('species', '/species', {'name': 'SpeciesTest888', 'finca_id': 1}),
    ('breeds', '/breeds', {'name': 'BreedTest888', 'species_id': 1, 'finca_id': 1}),
    ('fields', '/fields', {'name': 'FieldTest888', 'area_hectares': 10.5, 'finca_id': 1}),

    # URLs corregidas
    ('fincas', '/fincas', {'name': 'FincaTest888', 'type': 'Educativa'}),
    ('food_types', '/food-types', {'name': 'FoodTest888', 'finca_id': 1}),

    # Existentes - verificar
    ('vaccines', '/vaccines', {'name': 'VaccineTest888', 'finca_id': 1}),
    ('medications', '/medications', {'name': 'MedicationTest888', 'finca_id': 1}),
    ('diseases', '/diseases', {'name': 'DiseaseTest888', 'finca_id': 1}),

    # Tareas
    ('tasks', '/tasks', {'title': 'TaskTest888', 'description': 'Test', 'finca_id': 1}),
]

results = {'ok': [], 'fail': []}

print('=' * 70)
print('PRUEBAS CRUD v2 - URLs CORREGIDAS')
print('=' * 70)

for name, path, test_data in ENTITIES:
    url = f'{BASE_URL}{path}'
    try:
        # GET LIST
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            print(f'✅ GET  {path} - {resp.status_code}')
            results['ok'].append(f'{name}: GET')
        else:
            print(f'❌ GET  {path} - {resp.status_code}')
            results['fail'].append(f'{name}: GET {resp.status_code}')
            continue

        # POST CREATE
        resp_post = requests.post(url, headers=HEADERS, json=test_data, timeout=10)
        item_id = None
        if resp_post.status_code in [201, 200]:
            try:
                data = resp_post.json()
                item_id = data.get('data', {}).get('id') or data.get('id')
            except:
                pass
            print(f'✅ POST {path} - {resp_post.status_code} (id:{item_id})')
            results['ok'].append(f'{name}: POST')
        elif resp_post.status_code == 422:
            err = resp_post.json().get('error', {}).get('fields', [{}])[0]
            field = err.get('field', 'unknown')
            msg = err.get('message', 'validation')[:30]
            print(f'⚠️ POST {path} - 422 (Field: {field} - {msg})')
            results['fail'].append(f'{name}: POST 422 - {field}')
            continue
        else:
            print(f'❌ POST {path} - {resp_post.status_code}: {resp_post.text[:60]}')
            results['fail'].append(f'{name}: POST {resp_post.status_code}')
            continue

        if item_id:
            # PUT UPDATE
            update_data = {k: v for k, v in test_data.items()}
            if 'name' in update_data:
                update_data['name'] = str(update_data['name']) + 'U'
            if 'title' in update_data:
                update_data['title'] = str(update_data['title']) + 'U'
            resp_put = requests.put(f'{url}/{item_id}', headers=HEADERS, json=update_data, timeout=10)
            if resp_put.status_code in [200, 201]:
                print(f'✅ PUT  {path}/{item_id} - {resp_put.status_code}')
                results['ok'].append(f'{name}: PUT')
            else:
                print(f'⚠️ PUT  {path}/{item_id} - {resp_put.status_code}')

            # DELETE
            resp_del = requests.delete(f'{url}/{item_id}', headers=HEADERS, timeout=10)
            if resp_del.status_code in [200, 204]:
                print(f'✅ DEL  {path}/{item_id} - {resp_del.status_code}')
                results['ok'].append(f'{name}: DELETE')
            elif resp_del.status_code == 409:
                err = resp_del.json().get('message', 'Unknown')[:40]
                print(f'⚠️ DEL  {path}/{item_id} - 409 (FK constraint: {err})')
                results['fail'].append(f'{name}: DELETE 409 - FK')
            else:
                print(f'❌ DEL  {path}/{item_id} - {resp_del.status_code}')
                results['fail'].append(f'{name}: DELETE {resp_del.status_code}')

    except Exception as e:
        print(f'❌ {path} - ERROR: {str(e)[:60]}')
        results['fail'].append(f'{name}: ERROR {str(e)[:30]}')

print()
print('=' * 70)
print(f'RESUMEN: {len(results["ok"])} OK | {len(results["fail"])} FALLAS')
print('=' * 70)
if results['fail']:
    print('\nFallas:')
    for f in results['fail']:
        print(f'  - {f}')
