#!/usr/bin/env python3
"""
Script para probar endpoints del backend y verificar que responden correctamente.
Requiere un token JWT válido para endpoints protegidos.
"""

import requests
import sys
from typing import Dict, List, Tuple

BASE_URL = "http://127.0.0.1:8181/api/v1"

# Endpoints a probar (sin autenticación)
PUBLIC_ENDPOINTS = [
    ("GET", "/info", "Información del sistema"),
]

# Endpoints que requieren autenticación (esperan 401 si no hay token)
PROTECTED_ENDPOINTS = [
    # Core
    ("GET", "/animals", "Lista de animales"),
    ("GET", "/species", "Lista de especies"),
    ("GET", "/breeds", "Lista de razas"),
    
    # Sanidad
    ("GET", "/diseases", "Lista de enfermedades"),
    ("GET", "/treatments", "Lista de tratamientos"),
    ("GET", "/medications", "Lista de medicamentos"),
    ("GET", "/vaccines", "Lista de vacunas"),
    ("GET", "/vaccinations", "Lista de vacunaciones"),
    
    # Terrenos
    ("GET", "/fields", "Lista de potreros"),
    ("GET", "/animal_fields", "Ubicación de animales"),
    
    # Alimentación
    ("GET", "/food_types", "Tipos de alimento"),
    ("GET", "/inventory", "Inventario"),
    
    # Usuarios y fincas
    ("GET", "/users", "Lista de usuarios"),
    ("GET", "/fincas", "Lista de fincas"),
    ("GET", "/membership/pending", "Solicitudes pendientes"),
    ("GET", "/membership/pending/count", "Conteo de solicitudes"),
    
    # Reproducción
    ("GET", "/reproduction/events", "Eventos de reproducción"),
    ("GET", "/reproduction/heat-alerts", "Alertas de celo"),
    
    # Controles
    ("GET", "/control", "Controles sanitarios"),
    
    # Chat (deshabilitado temporalmente)
    # ("GET", "/chat/contacts", "Contactos de chat"),
    # ("GET", "/chat/unread-count", "Mensajes no leídos"),
    
    # SSE (deshabilitado temporalmente)
    # ("GET", "/events", "Eventos SSE"),
]

def test_endpoint(method: str, endpoint: str, description: str, token: str = None) -> Tuple[bool, str]:
    """Prueba un endpoint y retorna éxito y mensaje"""
    url = f"{BASE_URL}{endpoint}"
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        response = requests.request(method, url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            return True, f"✅ OK (200)"
        elif response.status_code == 401:
            if token:
                return False, f"⚠️  Unauthorized (401) - Token inválido?"
            return True, f"🔒 Protegido (401) - Requiere login"
        elif response.status_code == 404:
            return False, f"❌ Not Found (404) - Endpoint no existe"
        elif response.status_code == 500:
            return False, f"❌ Server Error (500)"
        else:
            return False, f"⚠️  Status {response.status_code}"
            
    except requests.exceptions.ConnectionError:
        return False, f"❌ Connection Error - Backend no responde"
    except requests.exceptions.Timeout:
        return False, f"⏱️  Timeout"
    except Exception as e:
        return False, f"❌ Error: {str(e)[:50]}"

def main():
    print("=" * 80)
    print("🧪 PRUEBA DE ENDPOINTS DEL BACKEND")
    print(f"   URL Base: {BASE_URL}")
    print("=" * 80)
    
    # Intentar login para obtener token
    token = None
    print("\n🔐 Intentando obtener token de autenticación...")
    try:
        login_data = {
            "identification": "1098",
            "password": "Admin1234!",
            "finca_context": 1
        }
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if data.get("success") and "access_token" in data.get("data", {}):
                token = data["data"]["access_token"]
                print("   ✅ Login exitoso - Token obtenido")
            else:
                print("   ⚠️  Login respondió pero sin token")
        else:
            print(f"   ⚠️  Login falló: {resp.status_code}")
    except Exception as e:
        print(f"   ❌ Error de conexión: {e}")
    
    # Probar endpoints públicos
    print("\n📋 1. Endpoints Públicos:")
    for method, endpoint, description in PUBLIC_ENDPOINTS:
        success, msg = test_endpoint(method, endpoint, description)
        status = "✅" if success else "❌"
        print(f"   {status} {description:40s} {endpoint:25s} {msg}")
    
    # Probar endpoints protegidos
    print("\n📋 2. Endpoints Protegidos:")
    results = {"ok": 0, "protected": 0, "error": 0}
    
    for method, endpoint, description in PROTECTED_ENDPOINTS:
        success, msg = test_endpoint(method, endpoint, description, token)
        
        if "OK" in msg:
            results["ok"] += 1
            status = "✅"
        elif "Protegido" in msg:
            results["protected"] += 1
            status = "🔒"
        else:
            results["error"] += 1
            status = "❌"
        
        print(f"   {status} {description:40s} {endpoint:25s} {msg}")
    
    # Resumen
    print("\n" + "=" * 80)
    print("📊 RESUMEN:")
    print(f"   ✅ Funcionando: {results['ok']}")
    print(f"   🔒 Requieren auth: {results['protected']}")
    print(f"   ❌ Errores: {results['error']}")
    print("=" * 80)
    
    if results['error'] == 0:
        print("\n✅ Todos los endpoints están respondiendo correctamente!")
        return 0
    else:
        print(f"\n⚠️  {results['error']} endpoints tienen problemas")
        return 1

if __name__ == '__main__':
    sys.exit(main())
