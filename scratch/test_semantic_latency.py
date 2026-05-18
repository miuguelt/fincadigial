import requests
import time
import json

BASE_URL = "http://localhost:5000/api/v1" # Asumiendo puerto 5000 para el backend en local
# Nota: Ajustar puerto si es diferente. Probablemente 3100 o 3101 según el resumen previo.

def test_search_latency(query):
    # Intentar puertos comunes
    ports = [3101, 5000, 8000]
    token = "SIMULATED_TOKEN" # Necesitaría un token real para una prueba real, 
    # pero puedo medir el tiempo de respuesta del servidor (incluso si es 401).
    
    for port in ports:
        url = f"http://localhost:{port}/api/v1/analytics/ai-insights/search?q={query}"
        try:
            start = time.time()
            # No pasamos token para ver si el servidor responde (latencia de red/flask)
            response = requests.get(url, timeout=5)
            end = time.time()
            print(f"Puerto {port}: Respuesta en {end-start:.4f}s (Status: {response.status_code})")
        except Exception as e:
            print(f"Puerto {port}: No disponible")

if __name__ == "__main__":
    test_search_latency("vaca enferma")
