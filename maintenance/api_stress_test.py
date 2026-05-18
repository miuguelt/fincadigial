import requests
import time
import concurrent.futures
import json

BASE_URL = "http://127.0.0.1:8092/api/v1"
LOGIN_DATA = {
    "identifier": "1098",
    "password": "DevMiguel2024!"
}

def get_token():
    print(f"🔐 Intentando login en {BASE_URL}/auth/login...")
    response = requests.post(f"{BASE_URL}/auth/login", json=LOGIN_DATA)
    if response.status_code == 200:
        data = response.json()
        # El token puede estar en 'access_token' o 'data.access_token'
        token = data.get('access_token') or data.get('data', {}).get('access_token')
        if not token:
            # Reintentar con el formato que devuelve el unwrapApi si es necesario
            token = data.get('token')
        print("✅ Login exitoso.")
        return token
    else:
        print(f"❌ Error en login: {response.status_code} - {response.text}")
        return None

def hit_endpoint(token, endpoint_name, url):
    headers = {"Authorization": f"Bearer {token}"}
    start = time.time()
    try:
        response = requests.get(url, headers=headers, timeout=30)
        duration = time.time() - start
        return {
            "endpoint": endpoint_name,
            "status": response.status_code,
            "duration": duration,
            "success": response.status_code == 200
        }
    except Exception as e:
        return {
            "endpoint": endpoint_name,
            "status": "Error",
            "duration": time.time() - start,
            "success": False,
            "error": str(e)
        }

def run_stress_test(token, concurrency=5, iterations=10):
    url = f"{BASE_URL}/analytics/dashboard/complete"
    print(f"🚀 Iniciando prueba de estrés en {url}")
    print(f"👥 Concurrencia: {concurrency}, Iteraciones: {iterations}")
    
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(hit_endpoint, token, "dashboard_complete", url) for _ in range(iterations)]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
    
    return results

def main():
    token = get_token()
    if not token:
        return

    # Prueba de estrés
    concurrency_levels = [1, 5, 10]
    total_iterations = 20
    
    all_results = {}
    
    for c in concurrency_levels:
        print(f"\n--- Nivel de Concurrencia: {c} ---")
        results = run_stress_test(token, concurrency=c, iterations=total_iterations)
        all_results[f"concurrency_{c}"] = results
        
        durations = [r['duration'] for r in results if r['success']]
        if durations:
            avg = sum(durations) / len(durations)
            max_d = max(durations)
            min_d = min(durations)
            success_count = len(durations)
            print(f"📊 Resultados: Exitosos {success_count}/{total_iterations}")
            print(f"⏱️ Promedio: {avg:.4f}s, Max: {max_d:.4f}s, Min: {min_d:.4f}s")
        else:
            print("❌ Todas las peticiones fallaron.")

    # Guardar resultados
    with open("maintenance/api_stress_results.json", "w") as f:
        json.dump(all_results, f, indent=4)
    print("\n✅ Resultados guardados en maintenance/api_stress_results.json")

if __name__ == "__main__":
    main()
