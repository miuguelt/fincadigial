#!/usr/bin/env python3
"""
Prueba de APIs Frontend - VillaLuz
====================================

Verifica que los endpoints consumidos por los hooks React
están respondiendo correctamente con los datos poblados.

Uso:
    python test_frontend_apis.py [--verbose]

Autor: DevBrain System
Fecha: 2026-04-29
"""

import json
import requests
import argparse
from pathlib import Path
from urllib.parse import urljoin

from test_credentials import get_role_credentials

# Configuración
BASE_URL = "http://localhost:5000"
API_PREFIX = "/api/v1"


def get_auth_token():
    """Login and get JWT token"""
    url = urljoin(BASE_URL, API_PREFIX + "/auth/login")
    try:
        identifier, password = get_role_credentials("ADMIN")
    except RuntimeError as exc:
        print(f"Credenciales E2E no configuradas: {exc}")
        return None
    payload = {"identifier": identifier, "password": password}
    try:
        response = requests.post(url, json=payload, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data.get("data", {}).get("access_token")
    except Exception as e:
        print(f"Error during login: {e}")
    return None


def test_endpoint(
    name: str,
    method: str,
    endpoint: str,
    token: str,
    params: dict = None,
    expected_status: int = 200,
):
    """Probar un endpoint"""
    url = urljoin(BASE_URL, API_PREFIX + endpoint)
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    try:
        if method == "GET":
            response = requests.get(url, params=params, headers=headers, timeout=10)
        elif method == "POST":
            response = requests.post(url, json=params, headers=headers, timeout=10)
        else:
            return {"name": name, "status": "ERROR", "error": f"Método {method} no soportado"}

        success = response.status_code == expected_status

        result = {
            "name": name,
            "status": "OK" if success else "FAIL",
            "status_code": response.status_code,
            "url": url,
        }

        if success:
            try:
                data = response.json()
                if isinstance(data, list):
                    result["count"] = len(data)
                elif isinstance(data, dict):
                    # Check if it's the standard APIResponse structure
                    if "data" in data:
                        inner_data = data["data"]
                        if isinstance(inner_data, list):
                            result["count"] = len(inner_data)
                        elif isinstance(inner_data, dict):
                            result["keys"] = list(inner_data.keys())[:5]
                    else:
                        result["keys"] = list(data.keys())[:5]
            except:
                pass
        else:
            result["error"] = response.text[:200]

        return result

    except requests.exceptions.ConnectionError:
        return {"name": name, "status": "ERROR", "error": "No se pudo conectar al servidor"}
    except Exception as e:
        return {"name": name, "status": "ERROR", "error": str(e)}


def run_api_tests(verbose: bool = False):
    """Ejecutar todas las pruebas de APIs"""
    print("=" * 70)
    print("🧪 PRUEBA DE APIs FRONTEND - VILLALUZ")
    print("=" * 70)
    print(f"Base URL: {BASE_URL}")
    print(f"API Prefix: {API_PREFIX}")
    print("=" * 70)

    token = get_auth_token()
    if not token:
        print("❌ ERROR: No se pudo obtener token de autenticación")
        return []

    print("✅ Autenticación exitosa")
    print("=" * 70)

    # Tests para Milk Production
    tests = [
        # Milk Production APIs
        ("MilkProduction - Listar", "GET", "/milk-production", {"finca_id": 1}),
        # 4. Dashboard & Reports
        ("Dashboard - Resumen", "GET", "/analytics/dashboard", {}),
        ("Analytics - Producción", "GET", "/analytics/production/statistics", {}),
        # 5. Financial Module
        ("Financial - Listar Transacciones", "GET", "/financial/transactions", {"finca_id": 1}),
        ("Financial - Resumen", "GET", "/financial/summary", {}),
        # 6. Reproduction Module
        ("Reproduction - Listar Eventos", "GET", "/reproduction/events/", {}),
        ("Reproduction - Resumen", "GET", "/reproduction/summary", {}),
        ("Reproduction - Partos Pendientes", "GET", "/reproduction/pending-births", {}),
        ("Reproduction - Alertas de Celo", "GET", "/reproduction/heat-alerts", {}),
        # 7. Growth & Health
        ("Growth - Resumen", "GET", "/growth/summary", {}),
        ("Growth - Alertas", "GET", "/growth/alerts", {}),
        ("Health - Listar Tratamientos", "GET", "/treatments/", {}),
        # Inventory APIs
        ("Inventory - Listar Lotes", "GET", "/inventory/lots", {"finca_id": 1}),
        ("Inventory - Movimientos", "GET", "/inventory/movements", {"finca_id": 1}),
        ("Inventory - Resumen", "GET", "/inventory/summary", {}),
        ("Inventory - Alertas", "GET", "/inventory/alerts", {}),
        # Animal Images
        ("AnimalImages - Listar", "GET", "/animal-images/1", {}),
        # User Finca
        ("UserFinca - Listar", "GET", "/multi-finca/my-fincas", {}),
    ]

    results = []
    for name, method, endpoint, params in tests:
        result = test_endpoint(name, method, endpoint, token, params)
        results.append(result)

        icon = "✅" if result["status"] == "OK" else "❌" if result["status"] == "FAIL" else "⚠️"
        print(f"{icon} {name}")

        if verbose or result["status"] != "OK":
            print(f"   URL: {result.get('url', 'N/A')}")
            print(f"   Status: {result.get('status_code', 'N/A')}")

            if "count" in result:
                print(f"   Registros: {result['count']}")
            if "keys" in result:
                print(f"   Keys: {', '.join(result['keys'])}")
            if "error" in result:
                print(f"   Error: {result['error']}")
            print()

    # Resumen
    print("=" * 70)
    print("📊 RESUMEN DE PRUEBAS")
    print("=" * 70)

    ok = len([r for r in results if r["status"] == "OK"])
    fail = len([r for r in results if r["status"] == "FAIL"])
    error = len([r for r in results if r["status"] == "ERROR"])

    print(f"✅ Exitosas: {ok}/{len(results)}")
    print(f"❌ Fallidas: {fail}/{len(results)}")
    print(f"⚠️  Errores: {error}/{len(results)}")

    if fail > 0:
        print("\n❌ APIs con problemas:")
        for r in results:
            if r["status"] == "FAIL":
                print(f"  - {r['name']}: HTTP {r.get('status_code', 'N/A')}")

    if error > 0:
        print("\n⚠️  APIs con errores de conexión:")
        for r in results:
            if r["status"] == "ERROR":
                print(f"  - {r['name']}: {r.get('error', 'Unknown')}")

    print("=" * 70)

    return results


def main():
    global BASE_URL
    parser = argparse.ArgumentParser(description="Prueba de APIs Frontend")
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Mostrar detalles de cada prueba"
    )
    parser.add_argument("--url", type=str, default=BASE_URL, help="URL base del backend")

    args = parser.parse_args()

    if args.url:
        BASE_URL = args.url

    results = run_api_tests(verbose=args.verbose)

    # Guardar resultados
    result_path = (
        Path(__file__).resolve().parents[1] / "test-results" / "scripts" / "api_test_results.json"
    )
    result_path.parent.mkdir(parents=True, exist_ok=True)
    with open(result_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Resultados guardados en: {result_path}")


if __name__ == "__main__":
    main()
