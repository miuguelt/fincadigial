#!/usr/bin/env python3
"""
deploy_check.py — Verificador Pre-Despliegue Coolify
=====================================================
Corre este script ANTES de hacer deploy al VPS Contabo para
asegurarte de que todo está configurado correctamente.

Uso:
    python scripts/deploy_check.py
"""

import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent

ERRORS = []
WARNINGS = []
OK = []


def check(condition: bool, ok_msg: str, err_msg: str, warn: bool = False):
    if condition:
        OK.append(f"✅  {ok_msg}")
    elif warn:
        WARNINGS.append(f"⚠️   {err_msg}")
    else:
        ERRORS.append(f"❌  {err_msg}")


# ── 1. Archivos críticos existen ──────────────────────────────────────
required_files = [
    "docker-compose.coolify.yml",
    "backend/Dockerfile",
    "frontend/Dockerfile",
    "frontend/nginx.conf",
    "backend/requirements.txt",
    "backend/wsgi.py",
]

for f in required_files:
    path = ROOT / f
    check(path.exists(), f"Archivo existe: {f}", f"Falta archivo crítico: {f}")

# ── 2. Variables de entorno en docker-compose.coolify.yml ─────────────
compose_path = ROOT / "docker-compose.coolify.yml"
if compose_path.exists():
    compose_text = compose_path.read_text()
    required_vars = [
        "FLASK_SECRET_KEY",
        "JWT_SECRET_KEY",
        "DB_USER",
        "DB_PASSWORD",
        "DB_NAME",
        "DOMAIN",
        "VITE_API_BASE_URL",
        "VITE_FRONTEND_URL",
    ]
    for var in required_vars:
        check(
            # Match both ${VAR} and ${VAR:-default} patterns
            f"${{{var}}}" in compose_text or f"${{{var}:-" in compose_text,
            f"Variable referenciada en compose: {var}",
            f"Variable faltante en compose: {var}",
        )


# ── 3. .env.production.example no tiene valores por defecto inseguros ─
env_example = ROOT / ".env.production.example"
if env_example.exists():
    content = env_example.read_text()
    insecure_markers = ["GENERAR_CLAVE_SEGURA", "CONTRASEÑA_SEGURA"]
    has_insecure = any(m in content for m in insecure_markers)
    # El example DEBE tener los marcadores (es un template)
    check(
        has_insecure,
        ".env.production.example es un template (no tiene claves reales)",
        ".env.production.example parece tener valores reales — ¡no commitear!",
    )

# ── 4. .gitignore protege archivos sensibles ──────────────────────────
gitignore = ROOT / ".gitignore"
if gitignore.exists():
    gi_text = gitignore.read_text()
    sensitive = [".env.production", "*.pem", "*.key", "/backups"]
    for s in sensitive:
        check(s in gi_text, f".gitignore protege: {s}", f".gitignore NO protege: {s}", warn=True)

# ── 5. Multi-stage build en backend Dockerfile ────────────────────────
back_dockerfile = ROOT / "backend" / "Dockerfile"
if back_dockerfile.exists():
    df_text = back_dockerfile.read_text()
    check(
        "AS builder" in df_text and "AS production" in df_text,
        "Backend Dockerfile usa Multi-Stage build",
        "Backend Dockerfile NO usa Multi-Stage (imagen pesada)",
    )
    check(
        "appuser" in df_text,
        "Backend corre con usuario no-root (appuser)",
        "Backend corre como root (riesgo de seguridad)",
        warn=True,
    )

# ── 6. Nginx tiene headers de seguridad ───────────────────────────────
nginx_conf = ROOT / "frontend" / "nginx.conf"
if nginx_conf.exists():
    nc_text = nginx_conf.read_text()
    security_headers = ["X-Frame-Options", "X-Content-Type-Options", "Content-Security-Policy"]
    for h in security_headers:
        check(h in nc_text, f"Nginx header de seguridad: {h}", f"Nginx falta header: {h}")
    check(
        "server_tokens off" in nc_text,
        "Nginx oculta su versión (server_tokens off)",
        "Nginx expone su versión (server_tokens)",
        warn=True,
    )

# ── 7. PostgreSQL en vez de MySQL ────────────────────────────────────
compose_text2 = (ROOT / "docker-compose.coolify.yml").read_text() if compose_path.exists() else ""
check(
    "postgres" in compose_text2.lower(),
    "Compose usa PostgreSQL (óptimo para Contabo)",
    "Compose NO usa PostgreSQL — revisar configuración de DB",
)
check(
    "image: mysql" not in compose_text2.lower() and "image: mariadb" not in compose_text2.lower(),
    "Compose no depende de MySQL/MariaDB",
    "Compose tiene MySQL/MariaDB — se recomienda migrar a PostgreSQL",
    warn=True,
)

# ── 8. Healthchecks definidos ─────────────────────────────────────────
check(
    "healthcheck" in compose_text2.lower() and compose_text2.lower().count("healthcheck") >= 3,
    "Healthchecks definidos para backend, DB y Redis",
    "Faltan healthchecks en el compose",
    warn=True,
)

# ── 9. Volúmenes persistentes ─────────────────────────────────────────
check(
    "pg_data" in compose_text2 and "uploads_data" in compose_text2,
    "Volúmenes persistentes configurados (pg_data, uploads_data)",
    "Faltan volúmenes persistentes — se perderán datos en reinicios",
)

# ── Reporte final ──────────────────────────────────────────────────────
print("\n" + "═" * 60)
print("  FINCA VILLA LUZ — Verificación Pre-Deploy Coolify")
print("═" * 60)

for msg in OK:
    print(msg)

if WARNINGS:
    print("\n" + "─" * 60)
    for msg in WARNINGS:
        print(msg)

if ERRORS:
    print("\n" + "─" * 60)
    for msg in ERRORS:
        print(msg)

print("\n" + "═" * 60)
total = len(OK) + len(WARNINGS) + len(ERRORS)
print(
    f"  Resultado: {len(OK)}/{total} OK  |  {len(WARNINGS)} Avisos  |  {len(ERRORS)} Errores Críticos"
)
print("═" * 60 + "\n")

if ERRORS:
    print("🚫 Corrige los errores críticos antes de hacer deploy.\n")
    sys.exit(1)
elif WARNINGS:
    print("⚠️  El sistema puede desplegarse, pero revisa los avisos.\n")
    sys.exit(0)
else:
    print("🚀 ¡Todo listo! Puedes desplegar en Coolify.\n")
    sys.exit(0)
