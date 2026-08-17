import sys
import os
import glob

# Añadir la raíz del proyecto al path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../backend/app/services")))

from local_ai_service import LocalIntelligenceService


def index_text(service, content, source_name):
    # Dividir en fragmentos (chunks)
    chunks = content.split("\n\n")
    for i, chunk in enumerate(chunks):
        if len(chunk.strip()) > 30:
            service.add_to_index(chunk, metadata={"source": source_name, "chunk_id": i})


def main():
    service = LocalIntelligenceService()
    root_dir = "c:/Users/Miguel/Documents/Aplicaciones/_projects/villaluz"

    # 1. Indexar Documentación
    print("--- Indexando Documentación ---")
    doc_files = glob.glob(f"{root_dir}/*.md")
    for f in doc_files:
        print(f"Procesando {os.path.basename(f)}...")
        with open(f, encoding="utf-8") as file:
            index_text(service, file.read(), f)

    # 2. Indexar Código Python (backend)
    print("\n--- Indexando Código Backend ---")
    py_files = glob.glob(f"{root_dir}/backend/app/**/*.py", recursive=True)
    for f in py_files:
        if "__init__" in f or "venv" in f:
            continue
        print(f"Procesando {os.path.basename(f)}...")
        with open(f, encoding="utf-8") as file:
            index_text(service, file.read(), f)

    # 3. Indexar Frontend (Componentes Clave)
    print("\n--- Indexando Componentes Frontend ---")
    tsx_files = glob.glob(f"{root_dir}/frontend/src/**/*.tsx", recursive=True)
    for f in tsx_files:
        print(f"Procesando {os.path.basename(f)}...")
        with open(f, encoding="utf-8") as file:
            index_text(service, file.read(), f)

    service.save_index()
    print("\n🚀 CEREBRO LOCAL ACTUALIZADO. Todas las dimensiones han sido indexadas.")


if __name__ == "__main__":
    main()
