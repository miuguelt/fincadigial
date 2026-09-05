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
compose_file = "docker-compose.yaml" if (ROOT / "docker-compose.yaml").exists() else "docker-compose.yml"
required_files = [
    compose_file,
    "backend/Dockerfile",
    "backend/entrypoint.sh",
    "frontend/Dockerfile",
    "frontend/nginx.conf",
    "backend/requirements.txt",
    "backend/wsgi.py",
]

for f in required_files:
    path = ROOT / f
    check(path.exists(), f"Archivo existe: {f}", f"Falta archivo crítico: {f}")

# ── 2. Variables de entorno en Docker Compose (SSoT: docker-compose.yaml) ──
compose_path = ROOT / compose_file

if compose_path.exists():
    import re

    compose_text = compose_path.read_text(encoding="utf-8")

    # 🔴 Las 5 variables SSoT estrictamente requeridas por Coolify
    mandatory_vars = [
        "DOMAIN",
        "DATABASE_URL",
        "FLASK_SECRET_KEY",
        "VILLALUZ_ADMIN_EMAIL",
        "VILLALUZ_ADMIN_PASSWORD",
    ]
    for var in mandatory_vars:
        check(
            f"${{{var}}}" in compose_text,
            f"Variable obligatoria en compose: {var}",
            f"Variable obligatoria faltante en compose: {var}",
        )

    # 🛡️ Principio Smart Defaults: cero variables extra con ${VAR:-...} que inflen Coolify
    # El parser de Coolify crea casillas para cualquier token ${NOMBRE_VAR}
    all_interpolated = set(re.findall(r"\$\{([A-Za-z0-9_]+)(?::-[^}]*)?\}", compose_text))
    extra_coolify_vars = all_interpolated - set(mandatory_vars)
    check(
        len(extra_coolify_vars) == 0,
        f"Smart Defaults activo: solo 5 variables requeridas en Coolify (cero casillas sobrantes)",
        f"Variables extra detectadas en compose que inflarían Coolify: {extra_coolify_vars}",
    )

    # Validar que las variables derivadas y de seguridad estén correctamente ancladas
    check(
        "JWT_SECRET_KEY: ${FLASK_SECRET_KEY}" in compose_text,
        "JWT_SECRET_KEY hereda de FLASK_SECRET_KEY automáticamente",
        "JWT_SECRET_KEY debe heredar de FLASK_SECRET_KEY",
    )
    check(
        'VILLALUZ_SEED_DEMO_DATA: "false"' in compose_text or "VILLALUZ_SEED_DEMO_DATA: 'false'" in compose_text,
        "VILLALUZ_SEED_DEMO_DATA fijo en 'false' en producción",
        "VILLALUZ_SEED_DEMO_DATA debe estar estrictamente fijado en 'false'",
    )
    check(
        "VITE_API_BASE_URL: /api/v1" in compose_text,
        "VITE_API_BASE_URL fijado en /api/v1 (proxy inverso Nginx)",
        "VITE_API_BASE_URL debe apuntar a /api/v1 para Nginx",
    )


# ── 3. .env.production.example no tiene valores por defecto inseguros ─
env_example = ROOT / ".env.production.example"
if env_example.exists():
    content = env_example.read_text(encoding="utf-8")
    insecure_markers = ["GENERAR_CLAVE_SEGURA", "CONTRASEÑA_SEGURA"]
    has_insecure = any(m in content for m in insecure_markers)
    # El example DEBE tener los marcadores (es un template)
    check(
        has_insecure,
        ".env.production.example es un template seguro con marcadores",
        ".env.production.example parece tener valores reales — ¡no commitear!",
    )

# ── 4. .gitignore protege archivos sensibles ──────────────────────────
gitignore = ROOT / ".gitignore"
if gitignore.exists():
    gi_text = gitignore.read_text(encoding="utf-8")
    sensitive = [".env.production", "*.pem", "*.key", "/backups"]
    for s in sensitive:
        check(s in gi_text, f".gitignore protege: {s}", f".gitignore NO protege: {s}", warn=True)

# ── 5. Multi-stage build en backend Dockerfile ────────────────────────
back_dockerfile = ROOT / "backend" / "Dockerfile"
if back_dockerfile.exists():
    df_text = back_dockerfile.read_text(encoding="utf-8")
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
    nc_text = nginx_conf.read_text(encoding="utf-8")
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
compose_text2 = compose_path.read_text(encoding="utf-8") if compose_path.exists() else ""
check(
    "postgres" in compose_text2.lower(),
    "Compose usa PostgreSQL (óptimo para Contabo/Coolify)",
    "Compose NO usa PostgreSQL — revisar configuración de DB",
)
check(
    "image: mysql" not in compose_text2.lower() and "image: mariadb" not in compose_text2.lower(),
    "Compose no depende de MySQL/MariaDB",
    "Compose tiene MySQL/MariaDB — se recomienda migrar a PostgreSQL",
    warn=True,
)

# ── 8. Healthchecks definidos y arquitectura Coolify ──────────────────
check(
    "healthcheck" in compose_text2.lower() and compose_text2.lower().count("healthcheck") >= 2,
    "Healthchecks definidos para frontend y backend",
    "Faltan healthchecks en el compose",
    warn=True,
)
if "villaluz-db-init" in compose_text2:
    check(
        "exclude_from_hc: true" in compose_text2,
        "Tarea db-init excluida de healthchecks en Coolify (exclude_from_hc: true)",
        "Falta exclude_from_hc: true en la tarea de inicialización de base de datos",
    )
else:
    check(
        (ROOT / "backend" / "entrypoint.sh").exists(),
        "Migraciones y bootstrap automatizados en entrypoint del backend (Stack limpio de 2 contenedores)",
        "Falta script backend/entrypoint.sh para migraciones automáticas",
    )
import re
has_custom_networks = bool(re.search(r"^\s*networks\s*:", compose_text2, re.MULTILINE))
check(
    not has_custom_networks,
    "Sin redes personalizadas (red administrada automáticamente por Coolify)",
    "Contiene redes personalizadas (puede causar 504 Gateway Timeout en Coolify)",
)

# ── 9. Volúmenes persistentes (Cero pérdida de datos) ─────────────────
check(
    all(v in compose_text2 for v in ["uploads_data", "maintenance_logs", "app_logs", "backups_data"]),
    "Volúmenes persistentes configurados (uploads_data, maintenance_logs, app_logs, backups_data)",
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
