#!/bin/sh
set -e

echo "════════════════════════════════════════════════════════════"
echo "  FINCA VILLA LUZ — Backend Entrypoint (Producción)"
echo "════════════════════════════════════════════════════════════"

# ── 1. Esperar conexión con la base de datos ──────────────────────────
echo "🔄 Esperando conexión con la base de datos..."
python -c '
import time, sys, os
from sqlalchemy import create_engine
from config import config

cfg = config.get(os.getenv("FLASK_ENV", "production"), "default")
uri = getattr(cfg, "SQLALCHEMY_DATABASE_URI", None) or os.getenv("DATABASE_URL")
if not uri:
    print("❌ Error: DATABASE_URL no fue configurada.")
    sys.exit(1)

# Normalizar prefijos si es necesario
if uri.startswith("postgres://"):
    uri = uri.replace("postgres://", "postgresql+psycopg2://", 1)
elif uri.startswith("postgresql://") and not uri.startswith("postgresql+"):
    uri = uri.replace("postgresql://", "postgresql+psycopg2://", 1)
elif uri.startswith("mysql://") and not uri.startswith("mysql+"):
    uri = uri.replace("mysql://", "mysql+pymysql://", 1)

db_type = "MySQL" if "mysql" in uri else "PostgreSQL"
connected = False
for i in range(30):
    try:
        engine = create_engine(uri, pool_pre_ping=True)
        with engine.connect() as conn:
            print(f"✅ Conexión establecida exitosamente con {db_type}")
            connected = True
            break
    except Exception as e:
        print(f"⏳ Esperando base de datos {db_type} ({i+1}/30): {e}")
        time.sleep(2)

if not connected:
    print(f"❌ Timeout: No se pudo conectar a la base de datos {db_type} tras 60s")
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
