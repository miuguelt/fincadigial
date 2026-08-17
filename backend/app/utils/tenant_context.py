"""
Tenant Context - Contexto Multi-Finca
=====================================
Utilidades para manejar el contexto de tenant (finca) en requests.

Uso:
    from app.utils.tenant_context import get_current_finca_id, get_current_finca_type

    finca_id = get_current_finca_id()  # int | None
    finca_type = get_current_finca_type()  # str | None
"""

from flask_jwt_extended import get_jwt, get_jwt_identity
import logging
import os

logger = logging.getLogger(__name__)


def is_system_admin_identity(role: str | None, identification) -> bool:
    """Return whether an identity is the configured platform administrator."""
    if role != "Administrador":
        return False

    configured = (
        os.getenv("SYSTEM_ADMIN_IDENTIFICATION") or os.getenv("ADMIN_ID") or "1098"
    )
    allowed = {value.strip() for value in configured.split(",") if value.strip()}
    return str(identification or "").strip() in allowed


def is_current_system_admin() -> bool:
    """Check the current JWT without granting global access to every farm admin."""
    try:
        jwt_data = get_jwt() or {}
        return is_system_admin_identity(
            jwt_data.get("role"), jwt_data.get("identification")
        )
    except Exception:
        return False


def get_current_finca_id() -> int | None:
    """
    Obtiene el ID de la finca actual desde el JWT o el contexto de la aplicación.

    Prioridad:
    1. flask.g.finca_id (inyectado por middleware o tests)
    2. JWT claim 'finca_id'
    """
    # 1. Intentar desde el objeto global 'flask.g' de flask.Flask
    import flask

    if flask.has_app_context():
        try:
            if hasattr(flask.g, "finca_id") and flask.g.finca_id is not None:
                return int(flask.g.finca_id)
        except (ValueError, TypeError):
            pass

    # 2. Intentar desde el token JWT
    try:
        from flask_jwt_extended import get_jwt

        jwt_data = get_jwt()
        finca_id = jwt_data.get("finca_id")
        return int(finca_id) if finca_id is not None else None
    except Exception:
        return None


def get_current_finca_type() -> str | None:
    """
    Obtiene el tipo de finca (Educativa/Tradicional) desde el JWT.

    Returns:
        str: 'Educativa' o 'Tradicional'
        None: Si no hay JWT o no tiene finca_type
    """
    try:
        jwt_data = get_jwt()
        return jwt_data.get("finca_type")
    except Exception:
        return None


def get_current_user_role() -> str | None:
    """
    Obtiene el rol del usuario actual desde el JWT.

    Returns:
        str: Rol del usuario (ej: 'Administrador', 'Propietario', etc.)
        None: Si no hay JWT
    """
    try:
        jwt_data = get_jwt()
        return jwt_data.get("role")
    except Exception:
        return None


def get_current_user_id() -> int | None:
    """
    Obtiene el ID del usuario actual desde la identidad del JWT.

    Returns:
        int: ID del usuario autenticado
        None: Si no hay JWT o la identidad no es numérica
    """
    try:
        identity = get_jwt_identity()
        return int(identity) if identity is not None else None
    except (TypeError, ValueError):
        return None
    except Exception:
        return None


def get_tenant_context() -> dict:
    """
    Obtiene el contexto completo de tenant desde el JWT.

    Returns:
        dict: {
            'finca_id': int | None,
            'finca_type': str | None,
            'role': str | None,
            'user_id': int | None,
        }
    """
    try:
        jwt_data = get_jwt()
        return {
            "finca_id": jwt_data.get("finca_id"),
            "finca_type": jwt_data.get("finca_type"),
            "role": jwt_data.get("role"),
            "user_id": jwt_data.get("id"),
        }
    except Exception:
        return {
            "finca_id": None,
            "finca_type": None,
            "role": None,
            "user_id": None,
        }


# Modelos que requieren filtrado por finca (isolation tenant)
# NOTA: Esta lista debe coincidir con TENANT_TABLES en la migración
TENANT_MODELS = {
    "Animals",
    "Fields",
    "FoodTypes",
    "AnimalAlert",
    "AnimalAlertConfig",
    "ActivityLog",
    "ActivityDailyAgg",
    "Control",
    "Treatments",
    "Vaccinations",
    "GeneticImprovements",
    "ReproductiveEvent",
    "Offspring",
    "AnimalDiseases",
    "AnimalImages",
    "AnimalFields",
    "InventoryLot",
    "InventoryMovement",
    "MilkProduction",
    "OperationalCost",
    "Tasks",
    "AnimalGroup",
    "PastureAforo",
    "Infrastructure",
    "Transaction",
    "MilkSummary",
    "LivestockSummary",
    "TreatmentMedications",
    "TreatmentVaccines",
    "CropPlot",
    "CropActivity",
    "WaterSource",
    "WaterMeasurement",
    "ClimateRiskAlert",
    "MarketOffer",
    "TechnicalAssistanceRequest",
    "UserLocation",
    "Device",
    "SyncOperation",
    "SyncSession",
    "SyncOperationReceipt",
    "SyncConflict",
    "AttachmentBlob",
    "AnimalHealthHistory",
    "AnimalProductionMetrics",
    "BodyConditionScore",
    "ChatMessage",
    "JoinRequest",
    "LactationCycle",
    "NodeMessage",
    "FarmExpenses",
    "ProductionTarget",
    "SeasonalAdjustment",
    "SiniganRegistrations",
    "ManagementPlan",
    "Vaccines",
    "Medications",
    "Diseases",
    "RouteAdministration",
}


# Modelos sin columna finca_id propia: heredan el tenant de su registro padre.
# Formato: {'ModelName': ('foreign_key_column', 'app.models.module', 'ParentModel')}
TENANT_PARENT_MODELS = {
    "TreatmentMedications": ("treatment_id", "app.models.treatments", "Treatments"),
    "TreatmentVaccines": ("treatment_id", "app.models.treatments", "Treatments"),
}


def _resolve_parent_model(module_path: str, class_name: str):
    """Import the parent model lazily to avoid circular imports."""
    import importlib

    module = importlib.import_module(module_path)
    return getattr(module, class_name)


def is_tenant_model(model_class) -> bool:
    """
    Verifica si un modelo requiere filtrado por finca.

    Args:
        model_class: Clase del modelo a verificar

    Returns:
        bool: True si el modelo es tenant-aware
    """
    return model_class.__name__ in TENANT_MODELS


def apply_tenant_filter(query, model_class, finca_id: int | None = None):
    """
    Aplica filtro de tenant a una query si el modelo lo requiere.

    Args:
        query: Query SQLAlchemy
        model_class: Clase del modelo
        finca_id: ID de finca (opcional, si no se provee se obtiene del contexto)

    Returns:
        Query filtrada por finca_id si aplica
    """
    model_name = model_class.__name__

    # User is tenant-scoped through the N:M membership table (plus the legacy
    # finca_id column). Even the platform administrator must use /users/global
    # to cross tenant boundaries; /users always means the active finca.
    if model_name == "User":
        if finca_id is None:
            finca_id = get_current_finca_id()
        if finca_id is None:
            return query.filter(model_class.id == -1)

        from sqlalchemy import or_, select
        from app.models.user_finca import UserFinca

        member_user_ids = select(UserFinca.user_id).where(
            UserFinca.finca_id == finca_id,
            UserFinca.is_active.is_(True),
        )
        return query.filter(
            or_(
                model_class.finca_id == finca_id,
                model_class.id.in_(member_user_ids),
            )
        )

    # The platform administrator sees the master farm catalog. Every other
    # account only sees its active farm from the authenticated CRUD endpoint.
    if model_name == "Finca":
        if is_current_system_admin():
            return query
        if finca_id is None:
            finca_id = get_current_finca_id()
        if finca_id is None:
            return query.filter(model_class.id == -1)
        return query.filter(model_class.id == finca_id)

    if not is_tenant_model(model_class):
        return query

    # Obtener rol del JWT para permitir bypass a administradores globales
    user_role = get_current_user_role()
    import flask

    if finca_id is None:
        finca_id = get_current_finca_id()

    is_admin_check = (
        (flask.has_app_context() and getattr(flask.g, "is_admin", False))
        or (user_role == "Administrador" and finca_id is None)
        or not flask.has_request_context()
    )

    if is_admin_check:
        return query

    if finca_id is None:
        finca_id = get_current_finca_id()

    parent_rule = TENANT_PARENT_MODELS.get(model_class.__name__)

    # Si el modelo requiere tenant pero no hay finca_id en el contexto
    if finca_id is None:
        # Si estamos en un flask.request pero NO hay finca_id, bloquear acceso por seguridad
        if flask.has_app_context():
            if hasattr(model_class, "finca_id"):
                logger.warning(
                    f"Intento de acceso a {model_class.__name__} sin contexto de finca. Bloqueando query."
                )
                return query.filter(model_class.finca_id == -1)
            if parent_rule:
                logger.warning(
                    f"Intento de acceso a {model_class.__name__} sin contexto de finca. Bloqueando query."
                )
                return query.filter(getattr(model_class, parent_rule[0]) == -1)
        return query

    if hasattr(model_class, "finca_id"):
        return query.filter(model_class.finca_id == finca_id)

    # Modelos puente (treatment_medications, treatment_vaccines): el aislamiento
    # se hereda del tratamiento padre, que sí guarda finca_id.
    if parent_rule:
        fk_column, module_path, class_name = parent_rule
        try:
            parent_model = _resolve_parent_model(module_path, class_name)
        except Exception:
            logger.warning(
                f"No se pudo resolver el modelo padre {class_name} para {model_class.__name__}; "
                "la query queda sin filtro de finca",
                exc_info=True,
            )
            return query
        from app import db

        parent_ids = db.session.query(parent_model.id).filter(
            parent_model.finca_id == finca_id
        )
        return query.filter(getattr(model_class, fk_column).in_(parent_ids))

    return query
