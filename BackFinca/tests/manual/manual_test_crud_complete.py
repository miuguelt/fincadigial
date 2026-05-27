"""Pruebas CRUD completas para verificar todas las funcionalidades del sistema."""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import requests

BASE_URL = "http://localhost:8081/api/v1"

def test_login():
    """Probar login y obtener token."""
    print("=== TEST: LOGIN ===")
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json={
            "identifier": 1098,
            "password": "Admin1234!"
        })
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Login exitoso: {data.get('message', 'OK')}")
            return data.get('data', {}).get('access_token')
        else:
            print(f"Error: {response.text}")
            return None
    except Exception as e:
        print(f"Excepción: {e}")
        return None

def test_get_animals(token):
    """Probar obtener lista de animales."""
    print("\n=== TEST: GET ANIMALS ===")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/animals", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            animals = data.get('data', [])
            print(f"Animales obtenidos: {len(animals)}")
            if animals:
                print(f"Primer animal: {animals[0].get('record', 'N/A')}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Excepción: {e}")
        return False

def test_create_animal(token):
    """Probar crear un nuevo animal."""
    print("\n=== TEST: CREATE ANIMAL ===")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        import random
        new_animal = {
            "record": f"TEST-{random.randint(1000, 9999)}",
            "sex": "Hembra",
            "breeds_id": 1,
            "birth_date": "2024-01-01",
            "status": "Vivo",
            "weight": 300
        }
        response = requests.post(f"{BASE_URL}/animals", json=new_animal, headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code in [200, 201]:
            data = response.json()
            print(f"Animal creado: {data.get('data', {}).get('record', 'N/A')}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Excepción: {e}")
        return False

def test_get_fields(token):
    """Probar obtener lista de potreros."""
    print("\n=== TEST: GET FIELDS ===")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/fields", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            fields = data.get('data', [])
            print(f"Potreros obtenidos: {len(fields)}")
            if fields:
                print(f"Primer potrero: {fields[0].get('name', 'N/A')}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Excepción: {e}")
        return False

def test_get_users(token):
    """Probar obtener lista de usuarios."""
    print("\n=== TEST: GET USERS ===")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/users", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            users = data.get('data', [])
            print(f"Usuarios obtenidos: {len(users)}")
            if users:
                print(f"Primer usuario: {users[0].get('fullname', 'N/A')}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Excepción: {e}")
        return False

def test_get_vaccinations(token):
    """Probar obtener lista de vacunaciones."""
    print("\n=== TEST: GET VACCINATIONS ===")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/vaccinations", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            vaccinations = data.get('data', [])
            print(f"Vacunaciones obtenidas: {len(vaccinations)}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Excepción: {e}")
        return False

def test_get_finca(token):
    """Probar obtener información de la finca."""
    print("\n=== TEST: GET FINCA ===")
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/multi-finca/my-fincas", headers=headers)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Respuesta completa: {data}")
            fincas = data.get('data', [])
            print(f"Fincas obtenidas: {len(fincas)}")
            if fincas and isinstance(fincas, list) and len(fincas) > 0:
                first_finca = fincas[0]
                if isinstance(first_finca, dict):
                    print(f"Primera finca: {first_finca.get('name', 'N/A')} - Tipo: {first_finca.get('type', 'N/A')}")
                else:
                    print(f"Primera finca (no es dict): {first_finca}")
            return True
        else:
            print(f"Error: {response.text}")
            return False
    except Exception as e:
        print(f"Excepción: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    print("INICIANDO PRUEBAS CRUD COMPLETAS")
    print("=" * 50)

    # 1. Login
    token = test_login()
    if not token:
        print("\n❌ No se pudo obtener token. Abortando pruebas.")
        return

    # 2. Pruebas CRUD
    results = {
        "GET Animals": test_get_animals(token),
        "Create Animal": test_create_animal(token),
        "GET Fields": test_get_fields(token),
        "GET Users": test_get_users(token),
        "GET Vaccinations": test_get_vaccinations(token),
        "GET Finca": test_get_finca(token),
    }

    # Resumen
    print("\n" + "=" * 50)
    print("RESUMEN DE PRUEBAS")
    print("=" * 50)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    for test, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test}: {status}")

    print(f"\nTotal: {passed}/{total} pruebas pasaron")

    if passed == total:
        print("\n🎉 TODAS LAS PRUEBAS CRUD PASARON EXITOSAMENTE")
    else:
        print(f"\n⚠️ {total - passed} pruebas fallaron")

if __name__ == "__main__":
    main()
