#!/usr/bin/env python3
"""
🤖 AI-ORCHESTRATED E2E & AUTO-REPAIR SUITE
Script universal para diagnóstico de salud, sincronización y autorreparación de esquema PostgreSQL,
pruebas de humo de APIs reales (usando identidad universal SSOT) y auditoría de Vite/HMR.

Autor: Antigravity AI (DevBrain Core)
Fecha: 2026-05-22
"""

import sys
import os
import json
import socket
import requests
from datetime import datetime

# Asegurar codificación UTF-8 para salida de consola en Windows
sys.stdout.reconfigure(encoding="utf-8")

# Rutas del Ecosistema
PROJECT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
BACKEND_DIR = os.path.join(PROJECT_DIR, "backend")
if not os.path.isdir(BACKEND_DIR):
    BACKEND_DIR = os.path.join(PROJECT_DIR, "backend")

sys.path.insert(0, BACKEND_DIR)

# Directorio de logs de mantenimiento
MAINTENANCE_DIR = os.path.join(PROJECT_DIR, "maintenance")
LOGS_DIR = os.path.join(MAINTENANCE_DIR, "logs")
os.makedirs(LOGS_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOGS_DIR, "self_heal_run.json")

print("=" * 80)
print("🤖 INICIANDO ECOSISTEMA DE AUTORREPARACIÓN INTELIGENTE (SELF-HEALING) - VILLA LUZ")
print("=" * 80)
print(f"Hora de Inicio: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

report = {
    "timestamp": datetime.now().isoformat(),
    "ports": {},
    "database": {"status": "Unknown", "errors_found": [], "repaired_columns": []},
    "api_smoke_test": {"status": "Unknown", "endpoints": {}},
    "vite_hmr": {"status": "Unknown", "details": ""},
}

# ============================================================================
# 1. AUDITORÍA DE PUERTOS Y SERVICIOS
# ============================================================================
print("🔌 1. AUDITANDO PUERTOS Y SERVICIOS CLAVE...")
critical_ports = {
    "Vite Frontend": 3003,
    "Flask Backend": 8092,
    "PostgreSQL Dev": 5435,
    "Redis central": 6380,
}

all_ports_ok = True
for service, port in critical_ports.items():
    try:
        with socket.create_connection(("localhost", port), timeout=1.0) as s:
            print(f"   ✅ {service} (puerto {port}): ABIERTO y escuchando.")
            report["ports"][service] = {"port": port, "status": "OPEN"}
    except Exception:
        # Intentar fallback para backend puerto alterno
        if port == 8092:
            try:
                with socket.create_connection(("localhost", 8093), timeout=1.0) as s:
                    print(f"   ✅ {service} (puerto 8093 - alterno): ABIERTO y escuchando.")
                    report["ports"][service] = {"port": 8093, "status": "OPEN"}
                    critical_ports["Flask Backend"] = 8093
                    continue
            except Exception:
                pass
        print(f"   ❌ {service} (puerto {port}): CERRADO o no responde.")
        report["ports"][service] = {"port": port, "status": "CLOSED"}
        all_ports_ok = False

if all_ports_ok:
    print("   👉 Todos los servicios base de red están activos.\n")
else:
    print("   ⚠️ Algunos puertos están cerrados. Asegúrate de que WSL2 y Docker están corriendo.\n")

# ============================================================================
# 2. COMPARACIÓN Y AUTORREPARACIÓN DE ESQUEMA POSTGRESQL (SQLAlchemy vs DB Física)
# ============================================================================
print("🗃️ 2. INSPECCIONANDO ESQUEMA DE BASE DE DATOS POSTGRESQL Y AUTORREPARACIÓN...")
try:
    from app import create_app, db
    from sqlalchemy import text, inspect

    app = create_app("development")
    with app.app_context():
        # Obtener tablas e inspector
        inspector = inspect(db.engine)
        db_tables = inspector.get_table_names()
        metadata_tables = db.metadata.tables

        print(
            f"   Conectado a PostgreSQL: {db.engine.url.database} en {db.engine.url.host}:{db.engine.url.port}"
        )
        report["database"]["status"] = "CONNECTED"

        for table_name, table in metadata_tables.items():
            if table_name not in db_tables:
                print(
                    f"   ⚠️ Tabla faltante en DB física: '{table_name}'. Creando tabla automáticamente..."
                )
                try:
                    # Crear tabla específica faltante
                    table.create(db.engine)
                    print(f"   ✅ Tabla '{table_name}' creada exitosamente.")
                    report["database"]["repaired_columns"].append(f"CREATE TABLE {table_name}")
                except Exception as ex:
                    print(f"   ❌ Error al crear tabla '{table_name}': {ex}")
                    report["database"]["errors_found"].append(
                        f"Error creando tabla {table_name}: {str(ex)}"
                    )
                continue

            # Obtener columnas actuales en la BD física
            db_cols = {col["name"]: col for col in inspector.get_columns(table_name)}

            # Comparar con el modelo SQLAlchemy
            for col_name, column in table.columns.items():
                if col_name not in db_cols:
                    print(f"   ⚠️ Columna faltante en '{table_name}': '{col_name}' ({column.type}).")
                    report["database"]["errors_found"].append(
                        f"Columna faltante: {table_name}.{col_name}"
                    )

                    # Traducir tipos SQLAlchemy a PostgreSQL DDL
                    col_type_str = str(column.type).upper()
                    ddl_type = "VARCHAR(255)"
                    if "INTEGER" in col_type_str:
                        ddl_type = "INTEGER"
                    elif "FLOAT" in col_type_str or "NUMERIC" in col_type_str:
                        ddl_type = "DOUBLE PRECISION"
                    elif "BOOLEAN" in col_type_str:
                        ddl_type = "BOOLEAN"
                    elif "DATE" in col_type_str:
                        ddl_type = "DATE"
                    elif "TIMESTAMP" in col_type_str:
                        ddl_type = "TIMESTAMP"
                    elif "TEXT" in col_type_str:
                        ddl_type = "TEXT"
                    elif "VARCHAR" in col_type_str:
                        ddl_type = col_type_str  # ej: VARCHAR(128)

                    # Construir ALTER DDL
                    alter_query = f"ALTER TABLE {table_name} ADD COLUMN {col_name} {ddl_type}"

                    # Añadir valor por defecto si aplica
                    if column.default is not None:
                        # Si es entero
                        if "INTEGER" in ddl_type:
                            alter_query += " DEFAULT 0"
                        elif "BOOLEAN" in ddl_type:
                            alter_query += " DEFAULT FALSE"

                    try:
                        db.session.execute(text(alter_query))
                        db.session.commit()
                        print(
                            f"   ⚡ AUTORREPARADO: Columna '{col_name}' agregada con éxito a la tabla '{table_name}'."
                        )
                        report["database"]["repaired_columns"].append(
                            f"{table_name}.{col_name} ({ddl_type})"
                        )
                    except Exception as alter_ex:
                        db.session.rollback()
                        print(f"   ❌ Fallo al aplicar ALTER TABLE: {alter_ex}")
                        report["database"]["errors_found"].append(
                            f"Fallo ALTER {table_name}.{col_name}: {str(alter_ex)}"
                        )

        if not report["database"]["errors_found"]:
            print(
                "   ✅ Base de datos 100% sincronizada y saludable. Cero discrepancias encontradas."
            )
            report["database"]["status"] = "SYNCHRONIZED"
        else:
            if report["database"]["repaired_columns"]:
                print(
                    f"   🛠️ Reparaciones realizadas: {len(report['database']['repaired_columns'])} campos corregidos."
                )
                report["database"]["status"] = "REPAIRED"
            else:
                print(
                    "   ❌ Se encontraron discrepancias que no pudieron autorrepararse de forma automática."
                )
                report["database"]["status"] = "OUT_OF_SYNC"
except Exception as db_err:
    print(f"   ❌ Error crítico al conectar u operar con SQLAlchemy: {db_err}")
    report["database"]["status"] = "CRITICAL_ERROR"
    report["database"]["errors_found"].append(str(db_err))
print("")

# ============================================================================
# 3. PRUEBA DE HUMO DE APIs REALES (Autenticación e Identidad SSOT)
# ============================================================================
print("🧪 3. PRUEBAS DE HUMO DE APIS REALES Y AUTENTICACIÓN...")
# Resolver URL del backend dinámicamente
backend_url = f"http://localhost:{critical_ports.get('Flask Backend', 8092)}/api/v1"

# Cargar identidad desde una ubicación externa explícita o desde el gestor de
# variables de entorno. Nunca se incluye una contraseña por defecto en código.
identity_path = os.getenv("VILLALUZ_IDENTITY_FILE")
admin_id = os.getenv("VILLALUZ_E2E_ADMIN_ID")
admin_password = os.getenv("VILLALUZ_E2E_ADMIN_PASSWORD")

if identity_path:
    try:
        with open(identity_path, encoding="utf-8") as f:
            identity = json.load(f)
        for user in identity.get("test_users", []):
            if user.get("role") == "Administrador":
                admin_id = user.get("identificacion", admin_id)
                admin_password = user.get("password", admin_password)
                print(f"   🔑 Cargadas credenciales SSOT externas: Admin {admin_id}")
                break
    except Exception as e:
        print(f"   ⚠️ No se pudo leer VILLALUZ_IDENTITY_FILE={identity_path}: {e}")

if not admin_id or not admin_password:
    print(
        "   ❌ Faltan credenciales de smoke test. Define "
        "VILLALUZ_E2E_ADMIN_ID y VILLALUZ_E2E_ADMIN_PASSWORD "
        "o proporciona VILLALUZ_IDENTITY_FILE."
    )
    report["api_smoke_test"]["status"] = "MISSING_CREDENTIALS"
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    sys.exit(2)

# Iniciar pruebas HTTP
token = None
try:
    login_data = {"identification": str(admin_id), "password": admin_password, "finca_context": 1}
    login_resp = requests.post(f"{backend_url}/auth/login", json=login_data, timeout=5)

    if login_resp.status_code == 200:
        res_json = login_resp.json()
        if res_json.get("success") and "access_token" in res_json.get("data", {}):
            token = res_json["data"]["access_token"]
            print("   ✅ Autenticación exitosa. Token JWT obtenido.")
            report["api_smoke_test"]["endpoints"]["/auth/login"] = "200 OK"
        else:
            print("   ❌ Autenticación fallida: estructura JSON inesperada.")
            report["api_smoke_test"]["endpoints"]["/auth/login"] = "400 BAD_STRUCTURE"
    else:
        print(f"   ❌ Autenticación fallida con código HTTP {login_resp.status_code}.")
        report["api_smoke_test"]["endpoints"]["/auth/login"] = f"HTTP {login_resp.status_code}"
except Exception as conn_err:
    print(f"   ❌ Error conectando al endpoint de login: {conn_err}")
    report["api_smoke_test"]["endpoints"]["/auth/login"] = f"CONNECTION_ERROR: {str(conn_err)[:50]}"

# Probar endpoints protegidos
if token:
    headers = {"Authorization": f"Bearer {token}"}
    endpoints_to_test = {
        "/auth/me": "Perfil del usuario autenticado",
        "/animals": "Listado general de animales",
        "/membership/pending": "Solicitudes de membresía pendientes",
        "/species": "Catálogo de especies animales",
        "/breeds": "Catálogo de razas animales",
        "/users": "Administración de usuarios",
        "/fincas": "Listado de fincas asociadas",
    }

    smoke_success = True
    for endpoint, label in endpoints_to_test.items():
        try:
            url = f"{backend_url}{endpoint}"
            r = requests.get(url, headers=headers, timeout=5)

            if r.status_code == 200:
                print(f"   ✅ GET {endpoint:25s} - {label:35s} -> [200 OK]")
                report["api_smoke_test"]["endpoints"][endpoint] = "200 OK"
            else:
                print(f"   ❌ GET {endpoint:25s} - {label:35s} -> [HTTP {r.status_code}]")
                report["api_smoke_test"]["endpoints"][endpoint] = f"HTTP {r.status_code}"
                smoke_success = False
        except Exception as ep_err:
            print(f"   ❌ GET {endpoint:25s} - {label:35s} -> [FALLO CONEXIÓN]")
            report["api_smoke_test"]["endpoints"][endpoint] = f"ERROR: {str(ep_err)[:50]}"
            smoke_success = False

    if smoke_success:
        report["api_smoke_test"]["status"] = "ALL_PASS"
        print("   👉 Todos los endpoints críticos de negocio responden exitosamente (200 OK).\n")
    else:
        report["api_smoke_test"]["status"] = "DEGRADED"
        print(
            "   ⚠️ Algunos endpoints retornaron códigos de error. Diagnostica los logs del backend.\n"
        )
else:
    report["api_smoke_test"]["status"] = "AUTH_FAIL"
    print("   ❌ Omitiendo pruebas de endpoints protegidos por fallo de login.\n")

# ============================================================================
# 4. AUDITORÍA VITE E HMR (Caché y Pre-bundling)
# ============================================================================
print("⚡ 4. AUDITANDO CONFIGURACIÓN DE VITE E HMR...")
vite_config_path = os.path.join(PROJECT_DIR, "frontend", "vite.config.ts")
if os.path.isfile(vite_config_path):
    try:
        with open(vite_config_path, encoding="utf-8") as f:
            content = f.read()

        # Verificar optimizaciones de pre-bundling
        has_optimize = "optimizeDeps" in content and "include" in content
        if has_optimize:
            print(
                "   ✅ Vite Config: optimizeDeps.include detectado. Las dependencias masivas están pre-empaquetadas."
            )
            report["vite_hmr"]["status"] = "OPTIMIZED"
            report["vite_hmr"]["details"] = "Pre-bundling configured correctly."
        else:
            print(
                "   ⚠️ Vite Config: Falta sección optimizeDeps.include. Podrías experimentar fallas 504 HMR en el primer arranque."
            )
            report["vite_hmr"]["status"] = "NOT_OPTIMIZED"
            report["vite_hmr"]["details"] = "Missing optimizeDeps.include for heavy libs."
    except Exception as vf_err:
        print(f"   ❌ No se pudo leer vite.config.ts: {vf_err}")
        report["vite_hmr"]["status"] = "ERROR"
        report["vite_hmr"]["details"] = str(vf_err)
else:
    print("   ⚠️ No se localizó vite.config.ts en frontend/. Omitiendo.")
    report["vite_hmr"]["status"] = "NOT_FOUND"

# ============================================================================
# GUARDAR REPORTE Y FINALIZAR
# ============================================================================
with open(LOG_FILE, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print("\n" + "=" * 80)
print("📊 RESUMEN FINAL DE LA EVALUACIÓN:")
print("=" * 80)
print(f"1. Puertos y Red: {'🟢 COMPLETADO' if all_ports_ok else '🟡 DEGRADADO'}")
print(
    f"2. Base de Datos: {'🟢 SINCRONIZADA' if report['database']['status'] == 'SYNCHRONIZED' else '🔵 AUTORREPARADA' if report['database']['status'] == 'REPAIRED' else '🔴 ERROR/DESINCRONIZADA'}"
)
print(
    f"3. Pruebas de Humo API: {'🟢 EXITOSO (ALL PASS)' if report['api_smoke_test']['status'] == 'ALL_PASS' else '🔴 CON ERRORES'}"
)
print(
    f"4. Optimización HMR: {'🟢 CORRECTA' if report['vite_hmr']['status'] == 'OPTIMIZED' else '🟡 SIN OPTIMIZAR'}"
)
print(f"\nReporte JSON completo guardado en: [self_heal_run.json](file:///{LOG_FILE})")
print("=" * 80)

# Código de salida basado en gravedad
if (
    report["database"]["status"] in ["SYNCHRONIZED", "REPAIRED"]
    and report["api_smoke_test"]["status"] == "ALL_PASS"
):
    sys.exit(0)
else:
    sys.exit(1)
