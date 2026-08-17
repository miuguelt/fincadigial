"""
RBAC - Control de Acceso Basado en Roles
========================================

Matriz de permisos granulares por rol y entidad.

Estrategia: las escrituras usan default-deny. La lectura de datos operativos
está disponible para todos los roles conocidos; usuarios y seguridad requieren
un permiso explícito.
Las entidades del Módulo Campesino son públicas para usuarios autenticados.

Acciones válidas: read, create, update, delete
"""

from functools import wraps
from flask_jwt_extended import get_jwt, verify_jwt_in_request
from app.utils.response_handler import APIResponse
import logging

logger = logging.getLogger(__name__)

_ACTIONS_READ = ["read"]
_ACTIONS_READ_CREATE = ["read", "create"]
_ACTIONS_READ_CREATE_UPDATE = ["read", "create", "update"]
_ACTIONS_READ_CREATE_UPDATE_DELETE = ["read", "create", "update", "delete"]
_ACTIONS_NONE = []

HEALTH_ENTITIES = frozenset(
    {
        "vaccinations",
        "treatments",
        "controls",
        "animal-diseases",
        "diseases",
        "medications",
        "vaccines",
        "treatment-medications",
        "treatment-vaccines",
        "treatment-recommendations",
    }
)

CAMPESINO_ENTITIES = frozenset(
    {
        "crop-plots",
        "crop-activities",
        "water-sources",
        "water-measurements",
        "climate-risks",
        "market-offers",
        "technical-assistance",
        "offline-learning",
    }
)

SECURITY_ENTITIES = frozenset({"users", "security"})

# Datos personales de terceros: la matrícula profesional completa y el motivo de
# un rechazo solo los ve el titular y quien coteja. El resumen público de la
# insignia viaja por /professional-credentials/user/<id>/badge, fuera de esta
# matriz, con la matrícula enmascarada.
PERSONAL_DATA_ENTITIES = frozenset({"professional-credentials"})

# Lectura: política general. Todo rol autenticado y conocido puede LEER cualquier
# entidad operativa de la finca; solo las entidades sensibles siguen bajo
# default-deny por rol. Evita 403 arbitrarios cuando una entidad nueva no se
# agregó a la matriz de cada rol (la matriz de abajo rige create/update/delete).
READ_RESTRICTED_ENTITIES = SECURITY_ENTITIES | PERSONAL_DATA_ENTITIES

ROLE_PERMISSIONS = {
    "Administrador": "*",
    "Propietario": "*",
    "Capataz": {
        "animals": _ACTIONS_READ_CREATE_UPDATE,
        "animal-diseases": _ACTIONS_READ_CREATE_UPDATE,
        "animal-fields": _ACTIONS_READ_CREATE_UPDATE,
        "animal-groups": _ACTIONS_READ_CREATE_UPDATE,
        "breeds": _ACTIONS_READ,
        "controls": _ACTIONS_READ_CREATE,
        "diseases": _ACTIONS_READ,
        "fields": _ACTIONS_READ_CREATE_UPDATE,
        "finca-location": _ACTIONS_READ_CREATE_UPDATE,
        "fincas": _ACTIONS_READ,
        "food_types": _ACTIONS_READ,
        "genetic-improvements": _ACTIONS_READ_CREATE,
        "infrastructure": _ACTIONS_READ_CREATE_UPDATE,
        "inventory": _ACTIONS_READ_CREATE_UPDATE,
        "lactation-cycles": _ACTIONS_READ_CREATE_UPDATE,
        "management-plans": _ACTIONS_READ,
        "milk-production": _ACTIONS_READ_CREATE_UPDATE,
        "operational": _ACTIONS_READ_CREATE_UPDATE,
        "production-targets": _ACTIONS_READ_CREATE_UPDATE,
        "route-administrations": _ACTIONS_READ,
        "species": _ACTIONS_READ,
        "tasks": _ACTIONS_READ_CREATE_UPDATE,
        "treatment-medications": _ACTIONS_READ_CREATE,
        "treatment-recommendations": _ACTIONS_READ_CREATE,
        "treatment-vaccines": _ACTIONS_READ_CREATE,
        "treatments": _ACTIONS_READ_CREATE,
        "users": _ACTIONS_NONE,
        "vaccinations": _ACTIONS_READ_CREATE,
    },
    "Veterinario": {
        "animal-analytics": _ACTIONS_NONE,
        "animals": _ACTIONS_READ,
        "animal-diseases": _ACTIONS_READ_CREATE_UPDATE,
        "animal-fields": _ACTIONS_READ,
        "animal-groups": _ACTIONS_READ,
        "breeds": _ACTIONS_READ,
        "controls": _ACTIONS_READ_CREATE_UPDATE,
        "diseases": _ACTIONS_READ_CREATE_UPDATE,
        "fields": _ACTIONS_READ,
        "fincas": _ACTIONS_READ,
        "food_types": _ACTIONS_READ,
        "inventory": _ACTIONS_READ_CREATE_UPDATE,
        "lactation-cycles": _ACTIONS_READ_CREATE_UPDATE,
        "medications": _ACTIONS_READ,
        "milk-production": _ACTIONS_READ_CREATE_UPDATE,
        "production-targets": _ACTIONS_READ,
        "route-administrations": _ACTIONS_READ,
        "species": _ACTIONS_READ,
        "tasks": _ACTIONS_READ_CREATE_UPDATE_DELETE,
        "treatment-medications": _ACTIONS_READ_CREATE_UPDATE,
        "treatment-recommendations": _ACTIONS_READ_CREATE_UPDATE,
        "treatment-vaccines": _ACTIONS_READ_CREATE_UPDATE,
        "treatments": _ACTIONS_READ_CREATE_UPDATE,
        "vaccinations": _ACTIONS_READ_CREATE,
        "vaccines": _ACTIONS_READ,
    },
    "Instructor": {
        "animals": _ACTIONS_READ,
        "animal-diseases": _ACTIONS_READ,
        "animal-fields": _ACTIONS_READ,
        "animal-groups": _ACTIONS_READ,
        "breeds": _ACTIONS_READ,
        "controls": _ACTIONS_READ_CREATE,
        "diseases": _ACTIONS_READ,
        "fields": _ACTIONS_READ,
        "fincas": _ACTIONS_READ,
        "food_types": _ACTIONS_READ,
        "lactation-cycles": _ACTIONS_READ_CREATE,
        "milk-production": _ACTIONS_READ_CREATE,
        "route-administrations": _ACTIONS_READ,
        "species": _ACTIONS_READ,
        "tasks": _ACTIONS_READ_CREATE_UPDATE_DELETE,
        "treatment-medications": _ACTIONS_READ_CREATE,
        "treatment-recommendations": _ACTIONS_READ_CREATE,
        "treatment-vaccines": _ACTIONS_READ_CREATE,
        "treatments": _ACTIONS_READ_CREATE,
        "vaccinations": _ACTIONS_READ_CREATE,
        "vaccines": _ACTIONS_NONE,
    },
    "Operario": {
        "animals": _ACTIONS_READ,
        "animal-diseases": _ACTIONS_READ,
        "animal-fields": _ACTIONS_READ_CREATE,
        "animal-groups": _ACTIONS_READ,
        "breeds": _ACTIONS_READ,
        "controls": _ACTIONS_READ_CREATE,
        "diseases": _ACTIONS_READ,
        "fields": _ACTIONS_READ,
        "fincas": _ACTIONS_READ,
        "food_types": _ACTIONS_READ,
        "genetic-improvements": _ACTIONS_READ,
        "inventory": _ACTIONS_READ,
        "lactation-cycles": _ACTIONS_READ,
        "medications": _ACTIONS_READ,
        "milk-production": _ACTIONS_READ_CREATE,
        "operational": _ACTIONS_READ_CREATE,
        "route-administrations": _ACTIONS_READ,
        "species": _ACTIONS_READ,
        "tasks": ["read", "update"],
        "treatment-medications": _ACTIONS_READ,
        "treatment-recommendations": _ACTIONS_READ,
        "treatment-vaccines": _ACTIONS_READ,
        "treatments": _ACTIONS_READ,
        "vaccinations": _ACTIONS_READ,
        "vaccines": _ACTIONS_READ,
    },
    "Aprendiz": {
        "animals": _ACTIONS_READ,
        "animal-diseases": _ACTIONS_READ,
        "animal-fields": _ACTIONS_READ,
        "animal-groups": _ACTIONS_READ,
        "breeds": _ACTIONS_READ,
        "controls": _ACTIONS_READ,
        "diseases": _ACTIONS_READ,
        "fields": _ACTIONS_READ,
        "fincas": _ACTIONS_READ,
        "food_types": _ACTIONS_READ,
        "genetic-improvements": _ACTIONS_READ,
        "inventory": _ACTIONS_READ,
        "lactation-cycles": _ACTIONS_READ,
        "medications": _ACTIONS_READ,
        "milk-production": _ACTIONS_READ,
        "production-targets": _ACTIONS_READ,
        "route-administrations": _ACTIONS_READ,
        "species": _ACTIONS_READ,
        "tasks": _ACTIONS_READ,
        "treatment-medications": _ACTIONS_READ,
        "treatment-recommendations": _ACTIONS_READ,
        "treatment-vaccines": _ACTIONS_READ,
        "treatments": _ACTIONS_READ,
        "vaccinations": _ACTIONS_READ,
        "vaccines": _ACTIONS_READ,
    },
}

_ENTITY_ALIASES = {
    "control": "controls",
    "vaccine": "vaccines",
    "medication": "medications",
    "breed": "breeds",
    "specie": "species",
    "food_type": "food_types",
    "food-type": "food_types",
    "food-types": "food_types",
    "disease": "diseases",
    "animal_disease": "animal-diseases",
    "animal-disease": "animal-diseases",
    "disease-animals": "animal-diseases",
    "genetic-improvement": "genetic-improvements",
    "genetic_improvement": "genetic-improvements",
    "genetic_improvements": "genetic-improvements",
    "milk_production": "milk-production",
    "milk-production": "milk-production",
    "lactation_cycle": "lactation-cycles",
    "lactation-cycle": "lactation-cycles",
    "lactation_cycles": "lactation-cycles",
    "production_target": "production-targets",
    "production-target": "production-targets",
    "production_targets": "production-targets",
    "treatment_medication": "treatment-medications",
    "treatment-medications": "treatment-medications",
    "treatment_medications": "treatment-medications",
    "treatment_vaccine": "treatment-vaccines",
    "treatment-vaccines": "treatment-vaccines",
    "treatment_vaccines": "treatment-vaccines",
    "treatment_recommendation": "treatment-recommendations",
    "treatment-recommendations": "treatment-recommendations",
    "treatment_recommendations": "treatment-recommendations",
    "animal_group": "animal-groups",
    "animal-groups": "animal-groups",
    "management_plan": "management-plans",
    "management-plan": "management-plans",
    "management_plans": "management-plans",
    "operational_cost": "operational",
    "operational-cost": "operational",
    "operational_costs": "operational",
    "route_administration": "route-administrations",
    "route-administration": "route-administrations",
    "route_administrations": "route-administrations",
    "producer_profile": "producer-profiles",
    "producer-profiles": "producer-profiles",
    "professional_credential": "professional-credentials",
    "professional-credential": "professional-credentials",
    "professional_credentials": "professional-credentials",
    # Nombres heredados en singular usados por pantallas antiguas.
    "animal": "animals",
    "field": "fields",
    "task": "tasks",
    "user": "users",
    "treatment": "treatments",
    "vaccination": "vaccinations",
    "finca": "fincas",
}

_CANONICAL_ROLES = {role.casefold(): role for role in ROLE_PERMISSIONS}


def _resolve_entity(entity: str) -> str:
    normalized = str(entity or "").strip().lower()
    return _ENTITY_ALIASES.get(normalized, normalized)


def _resolve_role(role: str) -> str:
    """Accept enum values and harmless casing/whitespace differences in JWT claims."""
    raw_role = getattr(role, "value", role)
    normalized = str(raw_role or "").strip()
    return _CANONICAL_ROLES.get(normalized.casefold(), normalized)


def has_permission(role: str, entity: str, action: str) -> bool:
    role = _resolve_role(role)
    action = str(action or "").strip().lower()
    if not role or not action:
        return False

    entity = _resolve_entity(entity)

    if entity in CAMPESINO_ENTITIES:
        return True

    perms = ROLE_PERMISSIONS.get(role)
    if not perms:
        logger.warning(
            "RBAC: Rol desconocido '%s' para entidad '%s' (action=%s)",
            role,
            entity,
            action,
        )
        return False

    if perms == "*":
        return True

    if not isinstance(perms, dict):
        return False

    explicit_perms = perms.get(entity)

    # Lectura general para entidades no sensibles: solo se deniega si el rol la
    # tiene vetada de forma explícita (lista vacía). Entidad no listada => lectura.
    if action == "read" and entity not in READ_RESTRICTED_ENTITIES:
        return explicit_perms != _ACTIONS_NONE

    entity_perms = explicit_perms or []
    return entity_perms == "*" or action in entity_perms


def get_rbac_error_code(role: str, entity: str, action: str) -> str:
    role = _resolve_role(role)
    entity = _resolve_entity(entity)

    if role == "Veterinario":
        if entity in SECURITY_ENTITIES:
            return "VET_HEALTH_ONLY"
        if entity in HEALTH_ENTITIES:
            return "VET_CREATE_ONLY"
        return "VET_HEALTH_ONLY"

    if role == "Instructor":
        if entity == "animals":
            return (
                "INSTRUCTOR_HEALTH_ONLY"
                if action == "create"
                else "INSTRUCTOR_NO_MODIFY"
            )
        if entity in SECURITY_ENTITIES:
            return "INSTRUCTOR_NO_USERS"
        return "INSTRUCTOR_NO_MODIFY"

    if role == "Aprendiz":
        if entity in SECURITY_ENTITIES:
            return "APRENDIZ_NO_USERS"
        return "READONLY_ROLE"

    if role == "Capataz":
        if entity == "users":
            return "CAPATAZ_NO_USERS"
        if action == "delete":
            return "CAPATAZ_NO_DELETE"
        return "CAPATAZ_EDIT_LIMITED"

    if role == "Operario":
        if entity in SECURITY_ENTITIES:
            return "OPERARIO_NO_USERS"
        if action == "create" and entity not in {"controls", "animal-fields"}:
            return "OPERARIO_POST_LIMITED"
        return "OPERARIO_LIMITED"

    return "INSUFFICIENT_PERMISSIONS"


def require_permission(entity: str, action: str):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                verify_jwt_in_request()
                jwt_data = get_jwt()
                role = jwt_data.get("role") or ""

                if not has_permission(role, entity, action):
                    error_code = get_rbac_error_code(role, entity, action)
                    logger.warning(
                        "RBAC DENIED: role=%s entity=%s action=%s code=%s",
                        role,
                        entity,
                        action,
                        error_code,
                    )
                    return APIResponse.error(
                        message=f"No tienes permisos para realizar esta acción ({action} en {entity})",
                        status_code=403,
                        error_code=error_code,
                    )

                return f(*args, **kwargs)
            except Exception as e:
                return APIResponse.error(
                    message="Error de autorización",
                    details={"error": str(e)},
                    status_code=401,
                )

        return decorated_function

    return decorator
