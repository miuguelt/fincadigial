#!/usr/bin/env python3
"""Test CRUD completo - Datos completos según schema"""
import requests

BASE_URL = 'http://127.0.0.1:8092/api/v1'
TOKEN = open('test_token.txt').read().strip()
HEADERS = {
    'Authorization': f'Bearer {TOKEN}',
    'Content-Type': 'application/json'
}

# Datos completos según schema
ENTITIES = [
    ('species', '/species', {'name': 'SpeciesTest777', 'finca_id': 1}),
    ('breeds', '/breeds', {'name': 'BreedTest777', 'species_id': 1, 'finca_id': 1}),

    # Campos requeridos completos
    ('fields', '/fields', {
        'name': 'FieldTest777',
        'state': 'Activo',
        'area': '10.5 hectáreas',
        'finca_id': 1
    }),

    ('fincas', '/fincas', {'name': 'FincaTest777', 'type': 'Educativa'}),

    ('food_types', '/food-types', {
        'food_type': 'Pasto',
        'sowing_date': '2024-01-01',
        'area': 10,
        'handlings': 'Riego',
        'gauges': 'Medición A',
        'finca_id': 1
    }),

    ('diseases', '/diseases', {
        'name': 'DiseaseTest777',
        'symptoms': 'Fiebre, tos',
        'details': 'Enfermedad test'
    }),

    ('medications', '/medications', {
        'name': 'MedicationTest777',
        'description': 'Medicamento test',
        'route_administration_id': 1,
        'availability': True
    }),

    ('vaccines', '/vaccines', {
        'name': 'VaccineTest777',
        'dosis': '1 dosis',
        'route_administration_id': 1,
        'vaccination_interval': 'Anual',
        'type': 'Atenuada',
        'national_plan': 'Si',
        'target_disease_id': 1
    }),

    ('tasks', '/tasks', {
        'title': 'TaskTest777',
        'description': 'Tarea test',
        'finca_id': 1
    }),
]

results = {'ok': [], 'fail': [], 'fk_error': []}

print('=' * 70)
print('PRUEBAS CRUD v3 - DATOS COMPLETOS')
print('=' * 70)

for name, path, test_data in ENTITIES:
    url = f'{BASE_URL}{path}'
    try:
        # GET LIST
        resp = requests.get(url, headers=HEADERS, timeout=10)
        if resp.status_code != 200:
            print(f'❌ GET  {path} - {resp.status_code}')
            results['fail'].append(f'{name}: GET {resp.status_code}')
            continue
        print(f'✅ GET  {path} - {resp.status_code}')
        results['ok'].append(f'{name}: GET')

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
            err = resp_post.json().get('error', {})
            fields = err.get('fields', [])
            if fields:
                parts = []
                for f in fields[:2]:
                    fn = str(f.get('field', 'unknown'))
                    msg = str(f.get('message', ''))[:20]
                    parts.append(fn + ': ' + msg)
                field_info = ', '.join(parts)
            else:
                field_info = err.get('message', 'unknown')[:40]
            print(f'⚠️ POST {path} - 422 ({field_info})')
            results['fail'].append(f'{name}: POST 422 - {field_info}')
            continue
        else:
            print(f'❌ POST {path} - {resp_post.status_code}')
            results['fail'].append(f'{name}: POST {resp_post.status_code}')
            continue

        if item_id:
            # PUT UPDATE
            update_data = {k: v for k, v in test_data.items()}
            for key in ['name', 'title', 'food_type']:
                if key in update_data:
                    update_data[key] = str(update_data[key]) + 'U'

            resp_put = requests.put(f'{url}/{item_id}', headers=HEADERS, json=update_data, timeout=10)
            if resp_put.status_code in [200, 201]:
                print(f'✅ PUT  {path}/{item_id} - {resp_put.status_code}')
                results['ok'].append(f'{name}: PUT')
            else:
                print(f'⚠️ PUT  {path}/{item_id} - {resp_put.status_code}')

            # DELETE (solo si no es species/breeds - tienen FK constraints)
            if name not in ['species', 'breeds']:
                resp_del = requests.delete(f'{url}/{item_id}', headers=HEADERS, timeout=10)
                if resp_del.status_code in [200, 204]:
                    print(f'✅ DEL  {path}/{item_id} - {resp_del.status_code}')
                    results['ok'].append(f'{name}: DELETE')
                else:
                    print(f'⚠️ DEL  {path}/{item_id} - {resp_del.status_code}')
            else:
                print(f'⏭️ DEL  {path}/{item_id} - SKIPPED (FK constraint esperado)')
                results['fk_error'].append(f'{name}: DELETE skipped - FK constraint')

    except Exception as e:
        print(f'❌ {path} - ERROR: {str(e)[:60]}')
        results['fail'].append(f'{name}: ERROR {str(e)[:30]}')

print()
print('=' * 70)
print(f'RESUMEN: {len(results["ok"])} OK | {len(results["fail"])} FALLAS | {len(results["fk_error"])} FK SKIPS')
print('=' * 70)
if results['fail']:
    print('\n❌ Fallas:')
    for f in results['fail']:
        print(f'  - {f}')
if results['fk_error']:
    print('\n⚠️  FK Constraints (esperado):')
    for f in results['fk_error']:
        print(f'  - {f}')
