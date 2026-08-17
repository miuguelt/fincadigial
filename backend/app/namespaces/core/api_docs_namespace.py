"""
API Docs Namespace
==================

Endpoints para documentación y exportación de la API.

Incluye:
- Exportación a Postman Collection
- Guía de integración móvil
- Ejemplos de código
- OpenAPI/Swagger spec completo

Uso:
    GET  /api/v1/docs/postman         → Exportar colección Postman
    GET  /api/v1/docs/mobile-guide    → Guía de integración móvil
    GET  /api/v1/docs/examples        → Ejemplos de código
    GET  /api/v1/docs/openapi.json    → Spec OpenAPI completo
"""

import flask
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from app.utils.response_handler import APIResponse
import json
import logging
from datetime import datetime
from typing import Any

logger = logging.getLogger(__name__)

# Namespace
docs_ns = Namespace("docs", description="Documentación y exportación de API")


# =============================================================================
# Modelos para documentación Swagger
# =============================================================================

postman_collection_model = docs_ns.model(
    "PostmanCollection",
    {
        "info": fields.Nested(
            docs_ns.model(
                "PostmanInfo",
                {
                    "name": fields.String(example="Finca Villa Luz API"),
                    "description": fields.String(),
                    "version": fields.String(example="1.0.0"),
                },
            )
        ),
        "item": fields.List(fields.Raw),
    },
)

mobile_guide_model = docs_ns.model(
    "MobileGuide",
    {
        "title": fields.String(),
        "sections": fields.List(fields.Raw),
        "code_examples": fields.List(fields.Raw),
    },
)


# =============================================================================
# Postman Collection Generator
# =============================================================================


def generate_postman_collection(base_url: str = "") -> dict[str, Any]:
    """Generar colección Postman completa de la API."""

    collection = {
        "info": {
            "name": "Finca Villa Luz API",
            "description": "API RESTful para gestión integral de ganado. Incluye autenticación JWT, multi-tenant, operaciones offline, y reportes regulatorios.",
            "version": "1.0.0",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
            "contact": {"name": "Finca Villa Luz", "email": "api@fincavillaluz.com"},
        },
        "variable": [
            {"key": "baseUrl", "value": base_url, "type": "string"},
            {"key": "apiVersion", "value": "v1", "type": "string"},
            {"key": "accessToken", "value": "{{access_token}}", "type": "string"},
        ],
        "item": [],
    }

    # Auth Folder
    auth_folder = {
        "name": "🔐 Autenticación",
        "description": "Endpoints para login, registro y gestión de tokens JWT",
        "item": [
            {
                "name": "Login",
                "flask.request": {
                    "method": "POST",
                    "header": [{"key": "Content-Type", "value": "application/json"}],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps(
                            {"identifier": "99999999", "password": "<TEST_PASSWORD>"},
                            indent=2,
                        ),
                    },
                    "url": "{{baseUrl}}/api/{{apiVersion}}/auth/login",
                    "description": "Autenticar usuario y obtener tokens JWT",
                },
                "response": [],
            },
            {
                "name": "Refresh Token",
                "flask.request": {
                    "method": "POST",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{refresh_token}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/auth/refresh",
                    "description": "Renovar access token usando refresh token",
                },
            },
            {
                "name": "Perfil de Usuario",
                "flask.request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/auth/me",
                    "description": "Obtener información del usuario autenticado",
                },
            },
        ],
    }

    # Animals Folder
    animals_folder = {
        "name": "🐄 Animales",
        "description": "CRUD de animales, búsquedas, y gestión de imágenes",
        "item": [
            {
                "name": "Listar Animales",
                "flask.request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": {
                        "raw": "{{baseUrl}}/api/{{apiVersion}}/animals?page=1&per_page=20&sort_by=id&sort_order=desc",
                        "host": ["{{baseUrl}}"],
                        "path": ["api", "{{apiVersion}}", "animals"],
                        "query": [
                            {"key": "page", "value": "1"},
                            {"key": "per_page", "value": "20"},
                            {"key": "sort_by", "value": "id"},
                            {"key": "sort_order", "value": "desc"},
                        ],
                    },
                    "description": "Listar animales con paginación y filtros",
                },
            },
            {
                "name": "Crear Animal",
                "flask.request": {
                    "method": "POST",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"},
                        {"key": "Content-Type", "value": "application/json"},
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps(
                            {
                                "record": "ARETE-001",
                                "sex": "Macho",
                                "birth_date": "2023-01-15",
                                "weight": 450,
                                "species_id": 1,
                                "breed_id": 1,
                                "finca_id": "{{fincaId}}",
                            },
                            indent=2,
                        ),
                    },
                    "url": "{{baseUrl}}/api/{{apiVersion}}/animals",
                    "description": "Registrar nuevo animal en la finca",
                },
            },
            {
                "name": "Obtener Animal",
                "flask.request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/animals/{{animalId}}",
                    "description": "Obtener detalles de un animal específico",
                },
            },
            {
                "name": "Actualizar Animal",
                "flask.request": {
                    "method": "PUT",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"},
                        {"key": "Content-Type", "value": "application/json"},
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps(
                            {"weight": 460, "status": "Activo"}, indent=2
                        ),
                    },
                    "url": "{{baseUrl}}/api/{{apiVersion}}/animals/{{animalId}}",
                    "description": "Actualizar datos de un animal",
                },
            },
            {
                "name": "Eliminar Animal",
                "flask.request": {
                    "method": "DELETE",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/animals/{{animalId}}",
                    "description": "Eliminar animal del sistema",
                },
            },
        ],
    }

    # Health Folder
    health_folder = {
        "name": "🏥 Salud",
        "description": "Vacunaciones, tratamientos, controles y enfermedades",
        "item": [
            {
                "name": "Registrar Vacunación",
                "flask.request": {
                    "method": "POST",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"},
                        {"key": "Content-Type", "value": "application/json"},
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps(
                            {
                                "animal_id": "{{animalId}}",
                                "vaccine_id": 1,
                                "date": "2024-01-15",
                                "dose": "5ml",
                                "lot_number": "LOT-123",
                                "veterinarian": "Dr. García",
                                "observations": "Vacuna contra brucelosis",
                            },
                            indent=2,
                        ),
                    },
                    "url": "{{baseUrl}}/api/{{apiVersion}}/vaccinations",
                    "description": "Registrar una vacunación",
                },
            },
            {
                "name": "Registrar Tratamiento",
                "flask.request": {
                    "method": "POST",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"},
                        {"key": "Content-Type", "value": "application/json"},
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps(
                            {
                                "animal_id": "{{animalId}}",
                                "medication_id": 1,
                                "date": "2024-01-15",
                                "dose": "10ml",
                                "veterinarian": "Dr. García",
                                "observations": "Tratamiento para infección",
                            },
                            indent=2,
                        ),
                    },
                    "url": "{{baseUrl}}/api/{{apiVersion}}/treatments",
                    "description": "Registrar un tratamiento médico",
                },
            },
        ],
    }

    # Analytics Folder
    analytics_folder = {
        "name": "📊 Analytics",
        "description": "Reportes, KPIs, y estadísticas",
        "item": [
            {
                "name": "Dashboard Stats",
                "flask.request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/analytics/dashboard",
                    "description": "Obtener estadísticas del dashboard",
                },
            },
            {
                "name": "KPIs",
                "flask.request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/analytics/kpis",
                    "description": "Obtener KPIs de la finca",
                },
            },
            {
                "name": "Live Stats (SSE)",
                "flask.request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/analytics/live",
                    "description": "Streaming de estadísticas en tiempo real (Server-Sent Events)",
                },
            },
        ],
    }

    # Multi-Finca Folder
    multifinca_folder = {
        "name": "🏘️ Multi-Finca",
        "description": "Gestión de múltiples fincas por usuario",
        "item": [
            {
                "name": "Mis Fincas",
                "flask.request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/multi-finca/my-fincas",
                    "description": "Listar fincas del usuario",
                },
            },
            {
                "name": "Cambiar Finca",
                "flask.request": {
                    "method": "POST",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"},
                        {"key": "Content-Type", "value": "application/json"},
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps({"finca_id": 2}, indent=2),
                    },
                    "url": "{{baseUrl}}/api/{{apiVersion}}/multi-finca/switch",
                    "description": "Cambiar a otra finca activa",
                },
            },
        ],
    }

    # Push Notifications Folder
    push_folder = {
        "name": "🔔 Push Notifications",
        "description": "Gestión de notificaciones Web Push",
        "item": [
            {
                "name": "VAPID Public Key",
                "flask.request": {
                    "method": "GET",
                    "url": "{{baseUrl}}/api/{{apiVersion}}/push/vapid-public-key",
                    "description": "Obtener clave pública VAPID para suscripción",
                },
            },
            {
                "name": "Subscribe",
                "flask.request": {
                    "method": "POST",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"},
                        {"key": "Content-Type", "value": "application/json"},
                    ],
                    "body": {
                        "mode": "raw",
                        "raw": json.dumps(
                            {
                                "subscription": {
                                    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
                                    "keys": {"p256dh": "BNc...", "auth": "aBCd..."},
                                }
                            },
                            indent=2,
                        ),
                    },
                    "url": "{{baseUrl}}/api/{{apiVersion}}/push/subscribe",
                    "description": "Suscribir dispositivo a notificaciones",
                },
            },
        ],
    }

    # Regulatory Reports Folder
    reports_folder = {
        "name": "📋 Reportes ICA/SENA",
        "description": "Reportes regulatorios para fincas tradicionales",
        "item": [
            {
                "name": "Inventario CSV",
                "flask.request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/regulatory-reports/inventory?format=csv",
                    "description": "Exportar inventario en formato CSV",
                },
            },
            {
                "name": "Movimientos",
                "flask.request": {
                    "method": "GET",
                    "header": [
                        {"key": "Authorization", "value": "Bearer {{accessToken}}"}
                    ],
                    "url": "{{baseUrl}}/api/{{apiVersion}}/regulatory-reports/movements?type=births&format=csv&date_from=2024-01-01",
                    "description": "Reporte de movimientos (nacimientos, muertes, ventas)",
                },
            },
        ],
    }

    collection["item"] = [
        auth_folder,
        animals_folder,
        health_folder,
        analytics_folder,
        multifinca_folder,
        push_folder,
        reports_folder,
    ]

    return collection


# =============================================================================
# Endpoints
# =============================================================================


@docs_ns.route("/postman")
class PostmanCollectionResource(Resource):
    """Exportar colección Postman de la API."""

    @jwt_required()
    @docs_ns.doc("postman_collection", security="jwt")
    @docs_ns.response(200, "Colección Postman", postman_collection_model)
    def get(self):
        """
        Exportar colección Postman completa de la API.

        Incluye todos los endpoints principales con ejemplos de uso.
        Puedes importar esto directamente en Postman.
        """
        try:
            # Obtener URL base de la petición
            base_url = flask.request.host_url.rstrip("/")
            if not base_url:
                base_url = (
                    flask.current_app.config.get("API_BASE_URL_NO_VERSION")
                    or flask.request.host_url.rstrip("/")
                    or ""
                )

            collection = generate_postman_collection(base_url)

            # Agregar metadata
            collection["info"]["_postman_id"] = (
                f"finca-villa-luz-{datetime.now().strftime('%Y%m%d')}"
            )
            collection["info"]["updated"] = datetime.now().isoformat()

            return APIResponse.success(
                message="Colección Postman generada",
                data=collection,
                headers={
                    "Content-Disposition": "attachment; filename=finca-villa-luz-api.postman_collection.json"
                },
            )

        except Exception as e:
            logger.error(f"Error generando Postman collection: {e}", exc_info=True)
            return APIResponse.error(
                "Error al generar colección", details={"error": str(e)}, status_code=500
            )


@docs_ns.route("/mobile-guide")
class MobileGuideResource(Resource):
    """Guía de integración para aplicaciones móviles."""

    @docs_ns.doc("mobile_guide")
    @docs_ns.response(200, "Guía de integración", mobile_guide_model)
    def get(self):
        """
        Obtener guía completa de integración para apps móviles.

        Incluye:
        - Autenticación JWT
        - Manejo de tokens
        - Sincronización offline
        - Push notifications
        - Ejemplos en Kotlin (Android) y Swift (iOS)
        """
        guide = {
            "title": "Guía de Integración Móvil - Finca Villa Luz API",
            "version": "1.0.0",
            "sections": [
                {
                    "title": "Autenticación",
                    "description": "La API usa JWT para autenticación.",
                    "steps": [
                        "Hacer login con identificación y password",
                        "Guardar access_token y refresh_token de forma segura",
                        "Enviar access_token en header Authorization: Bearer {token}",
                        "Usar refresh_token para obtener nuevo access_token cuando expire",
                    ],
                },
                {
                    "title": "Sincronización Offline",
                    "description": "La app debe funcionar sin conexión y sincronizar cuando recupere conectividad.",
                    "steps": [
                        "Almacenar operaciones pendientes en SQLite local",
                        'Mostrar indicador de "sin conexión" al usuario',
                        "Cuando hay conexión, enviar operaciones pendientes a /api/v1/animals (POST)",
                        "Usar conflict_resolution=merge para manejar conflictos",
                        "Guardar timestamp de última sincronización",
                    ],
                },
                {
                    "title": "Push Notifications",
                    "description": "Configurar notificaciones push para alertas importantes.",
                    "steps": [
                        "Obtener VAPID public key de /api/v1/push/vapid-public-key",
                        "Suscribirse usando Firebase Cloud Messaging (FCM)",
                        "Enviar suscripción a /api/v1/push/subscribe",
                        "Mostrar notificaciones locales cuando llegue push",
                    ],
                },
            ],
            "code_examples": {
                "android_kotlin": {
                    "auth": """
// Login
val response = api.login(identifier, password)
val accessToken = response.accessToken
val refreshToken = response.refreshToken

// Guardar en EncryptedSharedPreferences
encryptedPrefs.edit()
    .putString("access_token", accessToken)
    .putString("refresh_token", refreshToken)
    .apply()
""",
                    "api_request": """
// API flask.request con token
val client = OkHttpClient.Builder()
    .addInterceptor { chain ->
        val token = encryptedPrefs.getString("access_token", "")
        val flask.request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer $token")
            .build()
        chain.proceed(flask.request)
    }
    .build()
""",
                },
                "ios_swift": {
                    "auth": """
// Login
let response = try await api.login(identifier: "99999999", password: "<TEST_PASSWORD>")
Keychain.save(response.accessToken, forKey: "access_token")
Keychain.save(response.refreshToken, forKey: "refresh_token")
""",
                    "api_request": """
// API flask.request con token
var flask.request = URLRequest(url: url)
if let token = Keychain.get("access_token") {
    flask.request.setValue("Bearer \\(token)", forHTTPHeaderField: "Authorization")
}
""",
                },
                "flutter_dart": {
                    "auth": """
// Login
final response = await api.login(identifier, password);
await secureStorage.write(key: 'access_token', value: response.accessToken);
await secureStorage.write(key: 'refresh_token', value: response.refreshToken);
""",
                    "offline_sync": """
// Sincronización offline
final pendingOps = await sqlite.getPendingOperations();
for (final op in pendingOps) {
  try {
    await api.createAnimal(op.data);
    await sqlite.markAsSynced(op.id);
  } catch (e) {
    await sqlite.markAsFailed(op.id, e.message);
  }
}
""",
                },
            },
            "best_practices": [
                "Usar HTTPS siempre en producción",
                "No almacenar tokens en SharedPreferences sin encriptar",
                "Implementar retry con backoff exponencial para operaciones offline",
                "Manejar errores 401 refrescando el token automáticamente",
                "Sincronizar en background usando WorkManager (Android) o BGTaskScheduler (iOS)",
                "Mostrar feedback visual de sincronización al usuario",
            ],
            "endpoints_importantes": [
                {
                    "method": "POST",
                    "path": "/auth/login",
                    "desc": "Login y obtener tokens",
                },
                {
                    "method": "POST",
                    "path": "/auth/refresh",
                    "desc": "Renovar access token",
                },
                {"method": "GET", "path": "/auth/me", "desc": "Perfil del usuario"},
                {"method": "GET", "path": "/animals", "desc": "Listar animales"},
                {"method": "POST", "path": "/animals", "desc": "Crear animal"},
                {
                    "method": "GET",
                    "path": "/multi-finca/my-fincas",
                    "desc": "Fincas del usuario",
                },
                {
                    "method": "POST",
                    "path": "/multi-finca/switch",
                    "desc": "Cambiar finca",
                },
                {
                    "method": "GET",
                    "path": "/analytics/dashboard",
                    "desc": "Dashboard stats",
                },
            ],
        }

        return APIResponse.success(message="Guía de integración móvil", data=guide)


@docs_ns.route("/examples")
class CodeExamplesResource(Resource):
    """Ejemplos de código para integración."""

    @docs_ns.doc("code_examples")
    def get(self):
        """
        Obtener ejemplos de código para diferentes lenguajes y frameworks.
        """
        examples = {
            "javascript": {
                "login": """
// Login
const response = await fetch('/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    identifier: '99999999',
    password: '<TEST_PASSWORD>'
  })
});

const data = await response.json();
localStorage.setItem('access_token', data.data.access_token);
""",
                "authenticated_request": """
// Request autenticado
const token = localStorage.getItem('access_token');
const response = await fetch('/api/v1/animals', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
""",
            },
            "python": {
                "requests": """
import requests

# Login
response = requests.post('{{baseUrl}}/api/v1/auth/login', json={
    'identifier': '99999999',
  'password': '<TEST_PASSWORD>'
})

tokens = response.json()['data']
access_token = tokens['access_token']

# Request autenticado
headers = {'Authorization': f'Bearer {access_token}'}
response = requests.get('{{baseUrl}}/api/v1/animals', headers=headers)
animals = response.json()['data']['items']
"""
            },
            "curl": {
                "login": """
curl -X POST {{baseUrl}}/api/v1/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"identifier":"99999999","password":"<TEST_PASSWORD>"}'
""",
                "list_animals": """
curl -X GET {{baseUrl}}/api/v1/animals \\
  -H "Authorization: Bearer TU_ACCESS_TOKEN"
""",
            },
        }

        return APIResponse.success(message="Ejemplos de código", data=examples)


@docs_ns.route("/openapi.json")
class OpenAPISpecResource(Resource):
    """Obtener especificación OpenAPI/Swagger completa."""

    @docs_ns.doc("openapi_spec")
    def get(self):
        """
        Exportar especificación OpenAPI 3.0 completa.

        Compatible con Swagger UI, Postman, y generadores de SDK.
        """
        try:
            # Obtener la especificación del API actual
            import flask

            api = flask.current_app.extensions.get("restx_api")
            if api:
                spec = api.specs_json
            else:
                spec = {"error": "API spec no disponible"}

            # Agregar info adicional
            spec["info"]["x-logo"] = {
                "url": "/assets/logo.png",
                "altText": "Finca Villa Luz",
            }
            base_url_config = (
                flask.current_app.config.get("API_BASE_URL")
                or f"{flask.request.host_url.rstrip('/')}/api/v1"
            )
            spec["servers"] = [
                {"url": base_url_config, "description": "Current environment"},
            ]
            spec["externalDocs"] = {
                "description": "Documentación completa",
                "url": "/api/v1/docs/",
            }

            return flask.jsonify(spec)

        except Exception as e:
            logger.error(f"Error generando OpenAPI spec: {e}", exc_info=True)
            return APIResponse.error(
                "Error al generar especificación",
                details={"error": str(e)},
                status_code=500,
            )
