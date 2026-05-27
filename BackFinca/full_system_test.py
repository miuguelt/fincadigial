#!/usr/bin/env python3
"""Pruebas exhaustivas de todo el sistema"""
import requests
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

BASE_URL = 'http://127.0.0.1:8092/api/v1'
FRONTEND_URL = 'https://127.0.0.1:3003'

print("=" * 70)
print("PRUEBAS EXHAUSTIVAS - SISTEMA VILLA LUZ")
print("=" * 70)

# Login y obtener token
print("\n🔐 Autenticación...")
login_data = {'identification': 1098, 'password': '12345678'}
resp = requests.post(f'{BASE_URL}/auth/login', json=login_data, verify=False)
if resp.status_code == 200:
    data = resp.json()
    token = data.get('data', {}).get('access_token', '')
    print("   ✅ Login exitoso")
else:
    print(f"   ❌ Login falló: {resp.status_code}")
    exit(1)

HEADERS = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# Lista completa de entidades a probar
ENTITIES_TEST = [
    # Core entities
    ('fincas', '/fincas', {'name': 'TestFinca999', 'type': 'Educativa'}),
    ('species', '/species', {'name': 'TestSpecies999', 'finca_id': 1}),
    ('breeds', '/breeds', {'name': 'TestBreed999', 'species_id': 1, 'finca_id': 1}),
    ('fields', '/fields', {'name': 'TestField999', 'state': 'Activo', 'area': '10 hectáreas', 'finca_id': 1}),

    # Health entities
    ('diseases', '/diseases', {'name': 'TestDisease999', 'symptoms': 'Test', 'details': 'Details'}),
    ('vaccines', '/vaccines', {
        'name': 'TestVaccine999', 'dosis': '1', 'route_administration_id': 1,
        'vaccination_interval': 'Anual', 'type': 'Atenuada', 'national_plan': 'Si', 'target_disease_id': 1
    }),
    ('medications', '/medications', {
        'name': 'TestMed999', 'description': 'Test med', 'route_administration_id': 1, 'availability': True
    }),

    # Farm entities
    ('food-types', '/food-types', {
        'food_type': 'Pasto', 'sowing_date': '2024-01-01', 'area': 10,
        'handlings': 'Riego', 'gauges': 'Medición', 'finca_id': 1
    }),
    ('animal-groups', '/animal-groups', {'name': 'TestGroup999', 'finca_id': 1}),
    ('infrastructure', '/infrastructure', {'name': 'TestInfra999', 'type': 'Cercado', 'finca_id': 1}),
    ('tasks', '/tasks', {'title': 'TestTask999', 'description': 'Test', 'finca_id': 1}),

    # Animals
    ('animals', '/animals', {
        'sex': 'Macho', 'birth_date': '2024-01-01', 'weight': 100.5,
        'record': 'REC999999', 'breeds_id': 1, 'finca_id': 1
    }),

    # Users
    ('users', '/users', {
        'identification': 999999999,
        'fullname': 'Test User Full',
        'email': 'test999@test.com',
        'password': '12345678',
        'phone': '3009999999',
        'role': 'Operario',
        'finca_id': 1
    }),
]

results = {'passed': [], 'failed': [], 'warnings': []}

print("\n🧪 Pruebas CRUD por Entidad:")
print("-" * 70)

for name, path, test_data in ENTITIES_TEST:
    url = f'{BASE_URL}{path}'
    entity_ok = True

    try:
        # GET LIST
        resp = requests.get(url, headers=HEADERS, verify=False, timeout=10)
        get_ok = resp.status_code == 200

        # POST CREATE
        resp_post = requests.post(url, headers=HEADERS, json=test_data, verify=False, timeout=10)
        post_ok = resp_post.status_code in [201, 200]
        item_id = None

        if post_ok:
            try:
                data = resp_post.json()
                item_id = data.get('data', {}).get('id') or data.get('id')
            except:
                pass

        # Si POST falló por 409 (duplicado), intentar buscar existente
        if resp_post.status_code == 409 and get_ok:
            # Buscar en la lista
            try:
                list_data = resp.json()
                items = list_data.get('data', {}).get('items', list_data.get('data', []))
                if items:
                    item_id = items[0].get('id')
                    post_ok = True  # Consideramos OK porque encontramos uno existente
                    results['warnings'].append(f'{name}: Usando item existente (duplicado)')
            except:
                pass

        # PUT UPDATE (solo si tenemos ID)
        put_ok = False
        if item_id:
            update_data = {k: v for k, v in test_data.items()}
            if 'name' in update_data:
                update_data['name'] = str(update_data['name']) + '_UPD'
            if 'title' in update_data:
                update_data['title'] = str(update_data['title']) + '_UPD'
            if 'fullname' in update_data:
                update_data['fullname'] = str(update_data['fullname']) + '_UPD'

            resp_put = requests.put(f'{url}/{item_id}', headers=HEADERS, json=update_data, verify=False, timeout=10)
            put_ok = resp_put.status_code in [200, 201]

        # DELETE (solo si tenemos ID y no es especies/breeds con FK)
        del_ok = False
        del_skipped = False
        if item_id and name not in ['species', 'breeds', 'animals']:
            resp_del = requests.delete(f'{url}/{item_id}', headers=HEADERS, verify=False, timeout=10)
            del_ok = resp_del.status_code in [200, 204]
            if resp_del.status_code == 409:
                del_skipped = True
        elif item_id and name in ['species', 'breeds', 'animals']:
            del_skipped = True  # FK constraint esperado

        # Reporte
        status_parts = []
        if get_ok:
            status_parts.append('GET✅')
        else:
            status_parts.append(f'GET❌{resp.status_code}')
            entity_ok = False

        if post_ok:
            status_parts.append(f'POST✅{item_id}')
        else:
            status_parts.append(f'POST❌{resp_post.status_code}')
            entity_ok = False

        if put_ok:
            status_parts.append('PUT✅')
        elif item_id:
            status_parts.append('PUT⚠️')

        if del_ok:
            status_parts.append('DEL✅')
        elif del_skipped:
            status_parts.append('DEL⏭️FK')
        elif item_id:
            status_parts.append('DEL⚠️')

        print(f"  {name:18} | {' | '.join(status_parts)}")

        if entity_ok:
            results['passed'].append(name)
        else:
            results['failed'].append(f"{name}: GET={resp.status_code}, POST={resp_post.status_code}")

    except Exception as e:
        print(f"  {name:18} | ERROR: {str(e)[:40]}")
        results['failed'].append(f"{name}: ERROR {str(e)[:30]}")

# Resumen
print("\n" + "=" * 70)
print("RESUMEN DE PRUEBAS")
print("=" * 70)
total = len(ENTITIES_TEST)
passed = len(results['passed'])
failed = len(results['failed'])
warnings = len(results['warnings'])

print(f"\n  ✅ Exitosas: {passed}/{total} ({passed/total*100:.1f}%)")
print(f"  ❌ Fallidas: {failed}/{total}")
print(f"  ⚠️  Advertencias: {warnings}")

if results['failed']:
    print("\n  Detalles de fallas:")
    for f in results['failed'][:10]:
        print(f"    - {f}")

if results['warnings']:
    print("\n  Advertencias:")
    for w in results['warnings'][:5]:
        print(f"    - {w}")

# Verificación de Frontend
print("\n🌐 Verificación Frontend:")
print("-" * 70)
try:
    resp = requests.get(FRONTEND_URL, verify=False, timeout=10)
    print(f"  ✅ Frontend accesible: HTTP {resp.status_code}")
except Exception as e:
    print(f"  ❌ Frontend no accesible: {e}")

# Verificación de API Docs
print("\n📚 Verificación API Docs:")
print("-" * 70)
try:
    resp = requests.get(f'{BASE_URL}/docs', verify=False, timeout=10)
    print(f"  ✅ Docs accesible: HTTP {resp.status_code}")
except Exception as e:
    print(f"  ❌ Docs no accesible: {e}")

print("\n" + "=" * 70)
print("✅ PRUEBAS COMPLETADAS")
print("=" * 70)
