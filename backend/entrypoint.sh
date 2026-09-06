#!/bin/sh
set -e

echo "════════════════════════════════════════════════════════════"
echo "  FINCA VILLA LUZ — Backend Entrypoint (Producción)"
echo "════════════════════════════════════════════════════════════"

# ── 0. Validar variables de entorno requeridas ────────────────────────
echo "🔍 Validando variables de entorno requeridas en Coolify..."

# Fallback inteligente: heredar DOMAIN desde COOLIFY_FQDN o COOLIFY_URL si no se pasó explícito
if [ -z "$DOMAIN" ]; then
  if [ -n "$COOLIFY_FQDN" ]; then
    export DOMAIN="$COOLIFY_FQDN"
    echo "ℹ️ DOMAIN heredado automáticamente desde COOLIFY_FQDN: $DOMAIN"
  elif [ -n "$COOLIFY_URL" ]; then
    CLEAN_URL=$(echo "$COOLIFY_URL" | sed -e 's|^https://||' -e 's|^http://||' -e 's|/.*||' -e 's|:.*||')
    export DOMAIN="$CLEAN_URL"
    echo "ℹ️ DOMAIN heredado automáticamente desde COOLIFY_URL: $DOMAIN"
  fi
fi

python -c '
import sys, os

# Normalizar DOMAIN si llegó con esquema o puerto
domain = (os.getenv("DOMAIN") or os.getenv("COOLIFY_FQDN") or os.getenv("COOLIFY_URL") or "").strip()
if domain:
    clean_domain = domain.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
    os.environ["DOMAIN"] = clean_domain

missing = []
for var in ["DOMAIN", "DATABASE_URL", "FLASK_SECRET_KEY", "VILLALUZ_ADMIN_EMAIL", "VILLALUZ_ADMIN_PASSWORD"]:
    val = (os.getenv(var) or "").strip()
    if not val:
        missing.append(var)

if missing:
    missing_names = ", ".join(missing)
    print("=" * 65, flush=True)
    print(f"❌ ERROR CRÍTICO: Faltan variables obligatorias en Coolify: {missing_names}", flush=True)
    print("👉 Configure estas 5 variables en Coolify > Environment Variables:", flush=True)
    for m in missing:
        if m == "DOMAIN":
            print(f"   • DOMAIN: Tu dominio (ej: app.fincavillaluz.com)", flush=True)
        elif m == "DATABASE_URL":
            print(f"   • DATABASE_URL: Cadena de conexion PostgreSQL (postgresql://...)", flush=True)
        elif m == "FLASK_SECRET_KEY":
            print(f"   • FLASK_SECRET_KEY: Clave hex de 64 caracteres (ej: openssl rand -hex 32)", flush=True)
        elif m == "VILLALUZ_ADMIN_EMAIL":
            print(f"   • VILLALUZ_ADMIN_EMAIL: Correo del admin inicial", flush=True)
        elif m == "VILLALUZ_ADMIN_PASSWORD":
            print(f"   • VILLALUZ_ADMIN_PASSWORD: Contraseña segura (sin símbolos \"$\")", flush=True)
    print("⚠️ ATENCIÓN: No use el carácter \"$\" en contraseñas o claves en Coolify;", flush=True)
    print("   Docker Compose lo interpreta como variable e intenta reemplazarlo.", flush=True)
    print("=" * 65, flush=True)
    sys.exit(1)

secret = (os.getenv("FLASK_SECRET_KEY") or os.getenv("JWT_SECRET_KEY") or "").strip()
if len(secret) < 64:
    print(f"⚠️ ADVERTENCIA: FLASK_SECRET_KEY tiene solo {len(secret)} caracteres (se requieren >= 64).", flush=True)

print("✅ Variables de entorno requeridas verificadas correctamente.", flush=True)
'

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
