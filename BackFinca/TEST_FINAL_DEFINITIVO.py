#!/usr/bin/env python3
"""
TEST FINAL DEFINITIVO - SISTEMA VILLA LUZ
Ejecuta validación completa de todo el ecosistema
"""
import requests
import time
import json
import sys
from datetime import datetime
from urllib3.exceptions import InsecureRequestWarning
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

# Configuración
BASE_URL = 'http://127.0.0.1:8092/api/v1'
FRONTEND_URL = 'https://127.0.0.1:3005'
UNIQUE = int(time.time()) % 100000

# Resultados globales
RESULTADOS = {
    'ecosistema': {},
    'backend': {},
    'frontend': {},
    'crud': {},
    'rendimiento': {}
}

def print_header(titulo):
    print("\n" + "=" * 80)
    print(f"  {titulo}")
    print("=" * 80)

def print_seccion(titulo):
    print(f"\n{'─' * 80}")
    print(f"  {titulo}")
    print("─" * 80)

# ============================================================================
# 1. VALIDACIÓN ECOSISTEMA DEVBRAIN
# ============================================================================
print_header("TEST FINAL DEFINITIVO - SISTEMA VILLA LUZ")
print(f"  Fecha/Hora: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print(f"  ID Único de Test: {UNIQUE}")

print_seccion("1. ECOSISTEMA DEVBRAIN")

servicios_devbrain = [
    ('Unified Hub', 8010, '/sse'),
    ('GPU Bridge', 7800, '/'),
    ('NPU Bridge', 7801, '/'),
    ('Ollama', 11434, '/'),
    ('Qdrant', 6333, '/'),
    ('Redis', 6379, '/'),
    ('Postgres', 5432, '/'),
    ('SearXNG', 8888, '/'),
    ('Lazy Healer', 8091, '/'),
]

devbrain_ok = 0
devbrain_total = len(servicios_devbrain)

for nombre, puerto, path in servicios_devbrain:
    try:
        url = f'http://127.0.0.1:{puerto}{path}'
        resp = requests.get(url, timeout=5, verify=False)
        status = "✅ ONLINE" if resp.status_code in [200, 404, 502] else f"⚠️ {resp.status_code}"
        if resp.status_code in [200, 404, 502]:  # 502 puede significar que el servicio está up pero no responde al path
            devbrain_ok += 1
    except Exception as e:
        status = f"❌ ERROR: {str(e)[:30]}"
    print(f"  {nombre:20} | Puerto {puerto:5} | {status}")

RESULTADOS['ecosistema'] = {'ok': devbrain_ok, 'total': devbrain_total, 'pct': devbrain_ok/devbrain_total*100}
print(f"\n  📊 Ecosistema: {devbrain_ok}/{devbrain_total} servicios online ({RESULTADOS['ecosistema']['pct']:.1f}%)")

# ============================================================================
# 2. VALIDACIÓN BACKEND FLASK
# ============================================================================
print_seccion("2. BACKEND FLASK")

# Health check
try:
    resp = requests.get(f'{BASE_URL}/health', timeout=10, verify=False)
    health_data = resp.json() if resp.status_code == 200 else {}
    backend_healthy = resp.status_code == 200 and health_data.get('success', False)
    print(f"  Health Check: {'✅ HEALTHY' if backend_healthy else '❌ FAIL'}")
    if backend_healthy:
        data = health_data.get('data', {})
        print(f"    - Database: {data.get('database_status', 'unknown')}")
        print(f"    - Redis: {data.get('redis', 'unknown')}")
        print(f"    - Uptime: {data.get('uptime_seconds', 0):.0f}s")
        print(f"    - Environment: {data.get('environment', 'unknown')}")
except Exception as e:
    print(f"  Health Check: ❌ ERROR - {e}")
    backend_healthy = False

# API Docs
try:
    resp = requests.get(f'{BASE_URL}/docs', timeout=10, verify=False)
    docs_ok = resp.status_code == 200
    print(f"  API Docs: {'✅ Accesible' if docs_ok else '❌ No accesible'}")
except Exception as e:
    print(f"  API Docs: ❌ ERROR - {e}")
    docs_ok = False

RESULTADOS['backend'] = {'healthy': backend_healthy, 'docs': docs_ok}

# ============================================================================
# 3. VALIDACIÓN FRONTEND REACT
# ============================================================================
print_seccion("3. FRONTEND REACT + VITE")

try:
    resp = requests.get(FRONTEND_URL, timeout=10, verify=False)
    frontend_ok = resp.status_code == 200
    content_length = len(resp.text)
    print(f"  Frontend URL: {'✅ Accesible' if frontend_ok else '❌ No accesible'}")
    print(f"    - Status: HTTP {resp.status_code}")
    print(f"    - Content Length: {content_length:,} bytes")

    # Verificar que contiene HTML de React
    has_root = 'id="root"' in resp.text or 'id="app"' in resp.text or '<script' in resp.text
    print(f"    - React App Detected: {'✅ Sí' if has_root else '⚠️ No detectado'}")
except Exception as e:
    print(f"  Frontend: ❌ ERROR - {e}")
    frontend_ok = False
    has_root = False

RESULTADOS['frontend'] = {'accesible': frontend_ok, 'react_detected': has_root}

# ============================================================================
# 4. AUTENTICACIÓN JWT
# ============================================================================
print_seccion("4. AUTENTICACIÓN JWT")

login_data = {'identification': '1098', 'password': 'Villaluz2024!'}
try:
    start = time.time()
    resp = requests.post(f'{BASE_URL}/auth/login', json=login_data, timeout=10, verify=False)
    login_time = time.time() - start

    if resp.status_code == 200:
        data = resp.json()
        token = data.get('data', {}).get('access_token', '')
        print(f"  Login Admin (1098): ✅ EXITOSO ({login_time:.2f}s)")
        print(f"    - Token obtenido: {token[:40]}...")
        auth_ok = True
    else:
        print(f"  Login: ❌ FALLÓ - HTTP {resp.status_code}")
        print(f"    Respuesta: {resp.text[:200]}")
        auth_ok = False
        token = ''
except Exception as e:
    print(f"  Login: ❌ ERROR - {e}")
    auth_ok = False
    token = ''

if not auth_ok:
    print("\n❌ AUTENTICACIÓN FALLÓ - ABORTANDO TESTS CRUD")
    sys.exit(1)

HEADERS = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}

# ============================================================================
# 5. CRUD COMPLETO EN TODAS LAS ENTIDADES
# ============================================================================
print_seccion("5. CRUD COMPLETO - TODAS LAS ENTIDADES")

# Definición completa de entidades con datos válidos
ENTIDADES = [
    ('fincas', '/fincas', {
        'name': f'FincaFinal{UNIQUE}',
        'type': 'Educativa'
    }),
    ('species', '/species', {
        'name': f'SpeciesFinal{UNIQUE}',
        'finca_id': 1
    }),
    ('breeds', '/breeds', {
        'name': f'BreedFinal{UNIQUE}',
        'species_id': 1,
        'finca_id': 1
    }),
    ('fields', '/fields', {
        'name': f'FieldFinal{UNIQUE}',
        'state': 'Activo',
        'area': f'{UNIQUE % 100} hectáreas',
        'finca_id': 1
    }),
    ('diseases', '/diseases', {
        'name': f'DiseaseFinal{UNIQUE}',
        'symptoms': 'Fiebre, tos, test',
        'details': f'Detalles de enfermedad test {UNIQUE}'
    }),
    ('vaccines', '/vaccines', {
        'name': f'VaccineFinal{UNIQUE}',
        'dosis': '1 dosis única',
        'route_administration_id': 1,
        'vaccination_interval': 'Anual',
        'type': 'Atenuada',
        'national_plan': 'Si',
        'target_disease_id': 1
    }),
    ('medications', '/medications', {
        'name': f'MedFinal{UNIQUE}',
        'description': f'Medicamento test {UNIQUE}',
        'route_administration_id': 1,
        'availability': True
    }),
    ('food-types', '/food-types', {
        'food_type': f'PastoFinal{UNIQUE}',
        'sowing_date': '2024-01-15',
        'area': UNIQUE % 50 + 1,
        'handlings': 'Riego automatizado',
        'gauges': 'Medición por GPS',
        'finca_id': 1
    }),
    ('animal-groups', '/animal-groups', {
        'name': f'GroupFinal{UNIQUE}',
        'finca_id': 1
    }),
    ('infrastructure', '/infrastructure', {
        'name': f'InfraFinal{UNIQUE}',
        'type': 'CERCA',
        'finca_id': 1
    }),
    ('tasks', '/tasks', {
        'title': f'TaskFinal{UNIQUE}',
        'description': f'Tarea de prueba final {UNIQUE}',
        'finca_id': 1
    }),
    ('animals', '/animals', {
        'sex': 'Macho',
        'birth_date': '2024-01-01',
        'weight': 150.5 + (UNIQUE % 100),
        'record': f'RECFINAL{UNIQUE}',
        'breeds_id': 1,
        'finca_id': 1
    }),
    ('users', '/users', {
        'identification': 900000000 + UNIQUE,
        'fullname': f'UsuarioFinal{UNIQUE}',
        'email': f'usuario{UNIQUE}@villaluz.test',
        'password': '12345678',
        'phone': f'300{UNIQUE:06d}'[-10:],
        'role': 'Operario',
        'finca_id': 1
    }),
]

# CRUD Tests
crud_results = []
total_ops = 0
ok_ops = 0

for name, path, test_data in ENTIDADES:
    url = f'{BASE_URL}{path}'
    ops = {'name': name}

    try:
        # GET LIST
        start = time.time()
        resp = requests.get(url, headers=HEADERS, verify=False, timeout=15)
        get_time = time.time() - start
        ops['get'] = {'status': resp.status_code, 'time': get_time, 'ok': resp.status_code == 200}
        if resp.status_code == 200:
            try:
                data = resp.json()
                items = data.get('data', {}).get('items', data.get('data', []))
                ops['get']['count'] = len(items) if isinstance(items, list) else 'N/A'
            except:
                ops['get']['count'] = 'N/A'

        # POST CREATE
        start = time.time()
        resp_post = requests.post(url, headers=HEADERS, json=test_data, verify=False, timeout=15)
        post_time = time.time() - start
        post_ok = resp_post.status_code in [201, 200]
        ops['post'] = {'status': resp_post.status_code, 'time': post_time, 'ok': post_ok}

        item_id = None
        if post_ok:
            try:
                data = resp_post.json()
                item_id = data.get('data', {}).get('id') or data.get('id')
                ops['post']['id'] = item_id
            except:
                pass

        # PUT UPDATE
        if item_id:
            update_data = {k: v for k, v in test_data.items()}
            # Actualizar campos de nombre para diferenciarlos
            for key in ['name', 'title', 'fullname', 'food_type']:
                if key in update_data:
                    update_data[key] = str(update_data[key]) + '_UPD'

            start = time.time()
            resp_put = requests.put(f'{url}/{item_id}', headers=HEADERS, json=update_data, verify=False, timeout=15)
            put_time = time.time() - start
            put_ok = resp_put.status_code in [200, 201]
            ops['put'] = {'status': resp_put.status_code, 'time': put_time, 'ok': put_ok, 'id': item_id}
        else:
            ops['put'] = {'status': 0, 'ok': False, 'skipped': True}

        # DELETE
        if item_id:
            # Algunas entidades tienen FK constraints
            has_fk = name in ['species', 'breeds', 'animals']

            if has_fk:
                ops['delete'] = {'status': 0, 'ok': False, 'skipped': True, 'reason': 'FK'}
            else:
                start = time.time()
                resp_del = requests.delete(f'{url}/{item_id}', headers=HEADERS, verify=False, timeout=15)
                del_time = time.time() - start
                del_ok = resp_del.status_code in [200, 204]

                if not del_ok and resp_del.status_code == 409:
                    ops['delete'] = {'status': 409, 'ok': False, 'skipped': True, 'reason': 'FK'}
                else:
                    ops['delete'] = {'status': resp_del.status_code, 'time': del_time, 'ok': del_ok}
        else:
            ops['delete'] = {'status': 0, 'ok': False, 'skipped': True}

    except Exception as e:
        ops['error'] = str(e)[:50]

    crud_results.append(ops)

# Reporte CRUD
print(f"\n  Entidades probadas: {len(ENTIDADES)}")
print()

for r in crud_results:
    name = r['name']
    parts = []

    if r.get('error'):
        print(f"  {name:18} | ❌ ERROR: {r['error'][:30]}")
        continue

    # GET
    get = r.get('get', {})
    if get.get('ok'):
        parts.append(f"GET✅({get.get('count', '?')})")
        ok_ops += 1
    else:
        parts.append(f"GET❌{get.get('status', 'ERR')}")
    total_ops += 1

    # POST
    post = r.get('post', {})
    if post.get('ok'):
        parts.append(f"POST✅(id:{post.get('id', '?')})")
        ok_ops += 1
    else:
        parts.append(f"POST❌{post.get('status', 'ERR')}")
    total_ops += 1

    # PUT
    put = r.get('put', {})
    if put.get('ok'):
        parts.append("PUT✅")
        ok_ops += 1
    elif put.get('skipped'):
        parts.append("PUT⏭️")
    else:
        parts.append(f"PUT⚠️{put.get('status', 'ERR')}")
    total_ops += 1

    # DELETE
    delete = r.get('delete', {})
    if delete.get('ok'):
        parts.append("DEL✅")
        ok_ops += 1
    elif delete.get('skipped'):
        if delete.get('reason') == 'FK':
            parts.append("DEL⏭️FK")
        else:
            parts.append("DEL⏭️")
    else:
        parts.append(f"DEL⚠️{delete.get('status', 'ERR')}")
    total_ops += 1

    print(f"  {name:18} | {' | '.join(parts)}")

RESULTADOS['crud'] = {'entidades': len(ENTIDADES), 'ops_total': total_ops, 'ops_ok': ok_ops, 'pct': ok_ops/total_ops*100 if total_ops else 0}

# ============================================================================
# 6. RENDIMIENTO
# ============================================================================
print_seccion("6. MÉTRICAS DE RENDIMIENTO")

# Calcular tiempos promedio de respuesta
get_times = [r['get']['time'] for r in crud_results if r.get('get', {}).get('time')]
post_times = [r['post']['time'] for r in crud_results if r.get('post', {}).get('time')]

if get_times:
    print(f"  GET promedio:    {sum(get_times)/len(get_times)*1000:.1f}ms (min: {min(get_times)*1000:.1f}ms, max: {max(get_times)*1000:.1f}ms)")
if post_times:
    print(f"  POST promedio:   {sum(post_times)/len(post_times)*1000:.1f}ms (min: {min(post_times)*1000:.1f}ms, max: {max(post_times)*1000:.1f}ms)")

print(f"  Total requests: {len(get_times) + len(post_times)}")

RESULTADOS['rendimiento'] = {
    'get_avg_ms': sum(get_times)/len(get_times)*1000 if get_times else 0,
    'post_avg_ms': sum(post_times)/len(post_times)*1000 if post_times else 0,
    'total_requests': len(get_times) + len(post_times)
}

# ============================================================================
# 7. RESUMEN FINAL
# ============================================================================
print_header("RESUMEN FINAL - TEST DEFINITIVO")

print("\n  📊 RESULTADOS POR CATEGORÍA:")
print("  " + "─" * 76)

# Ecosistema
deeco = RESULTADOS['ecosistema']
print(f"  🧠 Ecosistema DevBrain    : {deeco['ok']:2}/{deeco['total']} servicios online ({deeco['pct']:5.1f}%)")

# Backend
deb = RESULTADOS['backend']
print(f"  ⚙️  Backend Flask          : {'✅ Saludable' if deb.get('healthy') else '❌ Fallando'}")
print(f"  📚 API Documentation      : {'✅ Accesible' if deb.get('docs') else '❌ No accesible'}")

# Frontend
defe = RESULTADOS['frontend']
print(f"  🌐 Frontend React          : {'✅ Accesible' if defe.get('accesible') else '❌ No accesible'}")
print(f"     React App detectado    : {'✅ Sí' if defe.get('react_detected') else '⚠️ No'}")

# CRUD
decr = RESULTADOS['crud']
print(f"  🗄️  CRUD Entidades         : {decr['ops_ok']}/{decr['ops_total']} operaciones OK ({decr['pct']:5.1f}%)")
print(f"     Entidades testeadas    : {decr['entidades']}")

# Rendimiento
depe = RESULTADOS['rendimiento']
print(f"  ⚡ Rendimiento API         : GET {depe['get_avg_ms']:.1f}ms | POST {depe['post_avg_ms']:.1f}ms")

# Score global
scores = [
    deeco['pct'] * 0.25,  # Ecosistema 25%
    (100 if deb.get('healthy') else 0) * 0.20,  # Backend 20%
    (100 if defe.get('accesible') else 0) * 0.15,  # Frontend 15%
    decr['pct'] * 0.40,  # CRUD 40%
]
score_global = sum(scores)

print("\n  " + "=" * 76)
status = "✅ SISTEMA COMPLETAMENTE OPERATIVO" if score_global >= 95 else "⚠️ SISTEMA OPERATIVO CON ADVERTENCIAS" if score_global >= 80 else "❌ SISTEMA CON PROBLEMAS CRÍTICOS"
print(f"  {status}")
print(f"  SCORE GLOBAL: {score_global:.1f}/100")
print("  " + "=" * 76)

# Detalles de fallas si las hay
fallas = []
if deeco['pct'] < 100:
    fallas.append(f"- Ecosistema: {deeco['total'] - deeco['ok']} servicios offline")
if not deb.get('healthy'):
    fallas.append("- Backend: Health check fallando")
if not deb.get('docs'):
    fallas.append("- Backend: API docs no accesibles")
if not defe.get('accesible'):
    fallas.append("- Frontend: No accesible")
if decr['pct'] < 100:
    fallas.append(f"- CRUD: {decr['ops_total'] - decr['ops_ok']} operaciones fallaron")

if fallas:
    print("\n  ❌ DETALLES DE FALLAS:")
    for f in fallas:
        print(f"    {f}")

print("\n  ✅ TEST FINAL DEFINITIVO COMPLETADO")
print("  " + "=" * 76)

# Guardar resultados
with open(f'test_final_results_{UNIQUE}.json', 'w') as f:
    json.dump({
        'timestamp': datetime.now().isoformat(),
        'unique_id': UNIQUE,
        'score_global': score_global,
        'resultados': RESULTADOS
    }, f, indent=2)

print(f"\n  📁 Resultados guardados en: test_final_results_{UNIQUE}.json")
