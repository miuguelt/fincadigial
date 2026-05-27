#!/usr/bin/env python3
"""Test CRUD completo de todas las entidades"""
import requests

BASE_URL = 'http://127.0.0.1:8092/api/v1'
TOKEN = open('test_token.txt').read().strip()
HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

ENTITIES = [
    ('finca', {'name': 'FincaTest999', 'type': 'Educativa'}),
    ('species', {'name': 'SpeciesTest999', 'finca_id': 1}),
    ('breeds', {'name': 'BreedTest999', 'species_id': 1, 'finca_id': 1}),
    ('fields', {'name': 'FieldTest999', 'area': 10.5, 'finca_id': 1}),
    ('food-types', {'name': 'FoodTest999', 'finca_id': 1}),
    ('animal-groups', {'name': 'GroupTest999', 'finca_id': 1}),
    ('infrastructure', {'name': 'InfraTest999', 'type': 'Cercado', 'finca_id': 1}),
    ('operational-costs', {'concept': 'Test Cost', 'amount': 100.50, 'date': '2024-01-01', 'category': 'Otros', 'finca_id': 1}),
]

results = {'ok': [], 'fail': []}

print('=' * 70)
print('PRUEBAS CRUD - ENTIDADES BASE')
print('=' * 70)

for entity, test_data in ENTITIES:
    url = f'{BASE_URL}/{entity}'
    try:
        # GET LIST
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code == 200:
            print(f'✅ GET  /{entity} - {resp.status_code}')
            results['ok'].append(f'{entity}: GET')
        else:
            print(f'❌ GET  /{entity} - {resp.status_code}')
            results['fail'].append(f'{entity}: GET {resp.status_code}')

        # POST CREATE
        resp_post = requests.post(url, headers=HEADERS, json=test_data, timeout=10)
        if resp_post.status_code in [201, 200]:
            data = resp_post.json()
            item_id = data.get('data', {}).get('id') or data.get('id')
            print(f'✅ POST /{entity} - {resp_post.status_code} (id:{item_id})')
            results['ok'].append(f'{entity}: POST')

            # PUT UPDATE
            update_data = test_data.copy()
            update_data['name'] = update_data.get('name', '') + '_UPDATED'
            resp_put = requests.put(f'{url}/{item_id}', headers=HEADERS, json=update_data, timeout=10)
            if resp_put.status_code in [200, 201]:
                print(f'✅ PUT  /{entity}/{item_id} - {resp_put.status_code}')
                results['ok'].append(f'{entity}: PUT')
            else:
                print(f'❌ PUT  /{entity}/{item_id} - {resp_put.status_code}')
                results['fail'].append(f'{entity}: PUT {resp_put.status_code}')

            # DELETE
            resp_del = requests.delete(f'{url}/{item_id}', headers=HEADERS, timeout=10)
            if resp_del.status_code in [200, 204]:
                print(f'✅ DEL  /{entity}/{item_id} - {resp_del.status_code}')
                results['ok'].append(f'{entity}: DELETE')
            else:
                print(f'❌ DEL  /{entity}/{item_id} - {resp_del.status_code}')
                results['fail'].append(f'{entity}: DELETE {resp_del.status_code}')
        else:
            print(f'❌ POST /{entity} - {resp_post.status_code}: {resp_post.text[:100]}')
            results['fail'].append(f'{entity}: POST {resp_post.status_code}')

    except Exception as e:
        print(f'❌ /{entity} - ERROR: {str(e)[:80]}')
        results['fail'].append(f'{entity}: ERROR {str(e)[:40]}')

print()
print('=' * 70)
print(f'RESUMEN: {len(results["ok"])} OK | {len(results["fail"])} FALLAS')
print('=' * 70)
if results['fail']:
    print('\nFallas detectadas:')
    for f in results['fail']:
        print(f'  - {f}')
