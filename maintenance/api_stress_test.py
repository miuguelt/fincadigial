"""Stress test for the dashboard API using credentials injected at runtime."""

import concurrent.futures
import json
import os
import time
from pathlib import Path

import requests


BASE_URL = os.getenv("VILLALUZ_STRESS_BASE_URL", "http://127.0.0.1:8092/api/v1")
PROJECT_ROOT = Path(__file__).resolve().parents[1]
RESULTS_PATH = PROJECT_ROOT / "test-results" / "api_stress_results.json"


def get_required_env(name: str) -> str:
    """Return a required environment value without exposing its content."""
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Falta {name}. Defínela en el entorno antes de ejecutar la prueba.")
    return value


def get_token() -> str | None:
    identifier = get_required_env("VILLALUZ_STRESS_TEST_ID")
    password = get_required_env("VILLALUZ_STRESS_TEST_PASSWORD")
    print(f"🔐 Intentando login en {BASE_URL}/auth/login...")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"identifier": identifier, "password": password},
        timeout=30,
    )
    if response.status_code != 200:
        print(f"❌ Login rechazado por el backend (HTTP {response.status_code}).")
        return None

    data = response.json()
    token = data.get("access_token") or data.get("data", {}).get("access_token")
    if not token:
        print("❌ La respuesta de login no contiene un token de acceso.")
        return None
    print("✅ Login exitoso.")
    return token


def hit_endpoint(token: str, endpoint_name: str, url: str) -> dict:
    headers = {"Authorization": f"Bearer {token}"}
    start = time.time()
    try:
        response = requests.get(url, headers=headers, timeout=30)
        duration = time.time() - start
        return {
            "endpoint": endpoint_name,
            "status": response.status_code,
            "duration": duration,
            "success": response.status_code == 200,
        }
    except Exception as error:
        return {
            "endpoint": endpoint_name,
            "status": "Error",
            "duration": time.time() - start,
            "success": False,
            "error": type(error).__name__,
        }


def run_stress_test(token: str, concurrency: int = 5, iterations: int = 10) -> list[dict]:
    url = f"{BASE_URL}/analytics/dashboard/complete"
    print(f"🚀 Iniciando prueba de estrés en {url}")
    print(f"👥 Concurrencia: {concurrency}, Iteraciones: {iterations}")

    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [
            executor.submit(hit_endpoint, token, "dashboard_complete", url)
            for _ in range(iterations)
        ]
        return [future.result() for future in concurrent.futures.as_completed(futures)]


def main() -> int:
    token = get_token()
    if not token:
        return 1

    all_results = {}
    for concurrency in (1, 5, 10):
        print(f"\n--- Nivel de Concurrencia: {concurrency} ---")
        results = run_stress_test(token, concurrency=concurrency, iterations=20)
        all_results[f"concurrency_{concurrency}"] = results

        durations = [result["duration"] for result in results if result["success"]]
        if durations:
            print(
                f"📊 Exitosos {len(durations)}/{len(results)} | "
                f"Promedio: {sum(durations) / len(durations):.4f}s | "
                f"Máximo: {max(durations):.4f}s | Mínimo: {min(durations):.4f}s"
            )
        else:
            print("❌ Todas las peticiones fallaron.")

    RESULTS_PATH.parent.mkdir(parents=True, exist_ok=True)
    RESULTS_PATH.write_text(json.dumps(all_results, indent=2), encoding="utf-8")
    print(f"\n✅ Resultados guardados en {RESULTS_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
