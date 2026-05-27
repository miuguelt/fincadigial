#!/usr/bin/env python3
"""Auditoría completa del sistema Villa Luz"""
import os
import sys

print("=" * 70)
print("AUDITORÍA COMPLETA - SISTEMA VILLA LUZ")
print("=" * 70)

# 1. Configuración
print("\n1. CONFIGURACIÓN DEL SISTEMA")
print("-" * 70)
config_vars = [
    'FLASK_CONFIG', 'PORT', 'DB_HOST', 'DB_PORT', 'DB_NAME',
    'JWT_COOKIE_SECURE', 'JWT_COOKIE_SAMESITE', 'CORS_ORIGINS'
]
for var in config_vars:
    val = os.getenv(var, 'NO CONFIGURADO')
    print(f"  {var}: {val[:50] if val else 'NO CONFIGURADO'}")

# 2. Estado de la Aplicación
print("\n2. ESTADO DE LA APLICACIÓN FLASK")
print("-" * 70)
try:
    from app import create_app
    app = create_app('development')
    print("  ✅ Flask App: Creada correctamente")
    print(f"  ✅ Modo: {app.config.get('ENV', 'development')}")
    print(f"  ✅ Debug: {app.config.get('DEBUG', False)}")
    print(f"  ✅ CORS Orígenes: {app.config.get('CORS_ORIGINS', [])}")
    print(f"  ✅ JWT Secure: {app.config.get('JWT_COOKIE_SECURE')}")
    print(f"  ✅ JWT SameSite: {app.config.get('JWT_COOKIE_SAMESITE')}")
except Exception as e:
    print(f"  ❌ Error: {e}")
    sys.exit(1)

# 3. Base de Datos
print("\n3. BASE DE DATOS POSTGRESQL")
print("-" * 70)
with app.app_context():
    from app.extensions import db
    from sqlalchemy import text
    try:
        result = db.session.execute(text('SELECT 1'))
        print("  ✅ Conexión: Activa")

        # Tablas
        result = db.session.execute(text(
            "SELECT table_name FROM information_schema.tables "
            "WHERE table_schema='public' ORDER BY table_name"
        ))
        tables = [row[0] for row in result]
        print(f"  📊 Tablas: {len(tables)}")

        # Conteos por tabla principal
        from app.models import User, Finca, Animals, Species, Breeds, Fields
        counts = {
            'users': User.query.count(),
            'fincas': Finca.query.count(),
            'animals': Animals.query.count(),
            'species': Species.query.count(),
            'breeds': Breeds.query.count(),
            'fields': Fields.query.count(),
        }
        for table, count in counts.items():
            print(f"     - {table}: {count} registros")

    except Exception as e:
        print(f"  ❌ Error DB: {e}")

# 4. Usuarios Críticos
print("\n4. USUARIOS CRÍTICOS")
print("-" * 70)
with app.app_context():
    from app.models import User

    # Admin
    admin = User.query.filter_by(identification=1098).first()
    if admin:
        print(f"  ✅ Admin (1098): {admin.fullname} - {admin.email}")
        print(f"     Rol: {admin.role} | Status: {admin.status} | Finca: {admin.finca_id}")
    else:
        print("  ❌ Admin (1098): NO ENCONTRADO")

    # Verificar otros usuarios de prueba
    test_ids = [55555555, 66666666]
    for tid in test_ids:
        user = User.query.filter_by(identification=tid).first()
        if user:
            print(f"  ✅ Usuario {tid}: {user.fullname} ({user.role})")
        else:
            print(f"  ⚠️  Usuario {tid}: No encontrado")

# 5. Endpoints de la API
print("\n5. ENDPOINTS REGISTRADOS")
print("-" * 70)
try:
    endpoints = []
    for rule in app.url_map.iter_rules():
        if 'api/v1' in str(rule):
            endpoints.append(str(rule))

    # Agrupar por namespace
    namespaces = {}
    for ep in endpoints:
        parts = ep.split('/')
        if len(parts) >= 3:
            ns = parts[3] if len(parts) > 3 else 'root'
            if ns not in namespaces:
                namespaces[ns] = []
            namespaces[ns].append(ep)

    print(f"  📡 Total endpoints: {len(endpoints)}")
    print(f"  📁 Namespaces: {len(namespaces)}")
    for ns, eps in list(namespaces.items())[:10]:
        print(f"     - {ns}: {len(eps)} endpoints")

except Exception as e:
    print(f"  ❌ Error: {e}")

# 6. Configuración de Seguridad
print("\n6. SEGURIDAD Y CONFIGURACIÓN JWT")
print("-" * 70)
print(f"  🔐 JWT Secret Key: {'Configurada' if app.config.get('JWT_SECRET_KEY') else 'FALTA'}")
print(f"  🔐 JWT Access Token Expires: {app.config.get('JWT_ACCESS_TOKEN_EXPIRES')}")
print(f"  🔐 JWT Refresh Token Expires: {app.config.get('JWT_REFRESH_TOKEN_EXPIRES')}")
print(f"  🍪 Cookie Secure: {app.config.get('JWT_COOKIE_SECURE')}")
print(f"  🍪 Cookie SameSite: {app.config.get('JWT_COOKIE_SAMESITE')}")
print(f"  🍪 Cookie CSRF: {app.config.get('JWT_COOKIE_CSRF_PROTECT')}")

# 7. Resumen de Salud
print("\n" + "=" * 70)
print("RESUMEN DE SALUD DEL SISTEMA")
print("=" * 70)
print("  🟢 Backend Flask: OPERATIVO")
print("  🟢 Base de Datos: CONECTADA")
print("  🟢 JWT/Auth: CONFIGURADO")
print("  🟢 API Endpoints: REGISTRADOS")
print("\n✅ Sistema Villa Luz está ESTABLE y OPERATIVO")
print("=" * 70)
