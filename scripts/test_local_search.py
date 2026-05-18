import sys
import os

# Añadir rutas
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../BackFinca/app/services')))

from local_ai_service import LocalIntelligenceService

def test_search():
    service = LocalIntelligenceService()
    
    # Datos de prueba rápidos (Simulando lo indexado)
    test_data = [
        "El orquestador de Windows gestiona el Sovereign Hub en el puerto 8005.",
        "La funcionalidad asíncrona usa SSE y HTTP para evitar bloqueos del IDE.",
        "El modelo DDD organiza los namespaces en carpetas como animals, health y farm.",
        "El sistema de inmunidad se activa instalando una tarea programada como Administrador.",
        "La NVIDIA 4070 se encarga del procesamiento pesado de IA mientras el NPU indexa."
    ]
    
    print("\n--- Alimentando Memoria Local de Prueba ---")
    for text in test_data:
        service.add_to_index(text)
    
    query = "Cómo funciona el sistema de inmunidad"
    print(f"\n🔍 Buscando localmente: '{query}'")
    
    results = service.search(query, top_k=2)
    
    print("\n--- Resultados del Cerebro Local (NPU/CPU) ---")
    for score, item in results:
        print(f"Score: {score:.4f} | Texto: {item['text']}")

if __name__ == "__main__":
    test_search()
