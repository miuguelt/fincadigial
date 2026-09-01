#!/bin/sh
set -e

echo "════════════════════════════════════════════════════════════"
echo "  FINCA VILLA LUZ — Backend Entrypoint (Producción)"
echo "════════════════════════════════════════════════════════════"

# ── 1. Esperar conexión con la base de datos ──────────────────────────
echo "🔄 Esperando conexión con la base de datos PostgreSQL..."
python -c '
import time, sys, os
from sqlalchemy import create_engine
from config import config

cfg = config.get(os.getenv("FLASK_ENV", "production"), "default")
uri = getattr(cfg, "SQLALCHEMY_DATABASE_URI", None) or os.getenv("SQLALCHEMY_DATABASE_URI") or os.getenv("DATABASE_URL")
if not uri:
    print("❌ Error: Ni DATABASE_URL ni variables DB_* fueron configuradas.")
    sys.exit(1)

# Normalizar prefijo de postgres si es necesario
if uri.startswith("postgres://"):
    uri = uri.replace("postgres://", "postgresql+psycopg2://", 1)
elif uri.startswith("postgresql://") and not uri.startswith("postgresql+"):
    uri = uri.replace("postgresql://", "postgresql+psycopg2://", 1)

connected = False
for i in range(30):
    try:
        engine = create_engine(uri, pool_pre_ping=True)
        with engine.connect() as conn:
            print("✅ Conexión establecida exitosamente con PostgreSQL")
            connected = True
            break
    except Exception as e:
        print(f"⏳ Esperando base de datos ({i+1}/30): {e}")
        time.sleep(2)

if not connected:
    print("❌ Timeout: No se pudo conectar a la base de datos tras 60s")
    sys.exit(1)
'

# ── 2. Ejecutar migraciones automáticas ────────────────────────────────
echo "🔧 Aplicando migraciones de base de datos (Flask-Migrate / Alembic)..."
flask db upgrade

# ── 3. Inicialización / Bootstrap de catálogos y admin único ──────────
echo "🌱 Verificando catálogos base colombianos y usuario administrador..."
python -m app.scripts.bootstrap_database || echo "⚠️ Advertencia en bootstrap (continuando arranque)"

# ── 4. Arrancar proceso principal (Gunicorn) ──────────────────────────
echo "🚀 Arrancando servidor Gunicorn..."
exec "$@"
