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

logger = logging.getLogger(__name__)


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
            if hasattr(flask.g, 'finca_id') and flask.g.finca_id is not None:
                return int(flask.g.finca_id)
        except (ValueError, TypeError):
            pass

    # 2. Intentar desde el token JWT
    try:
        from flask_jwt_extended import get_jwt
        jwt_data = get_jwt()
        finca_id = jwt_data.get('finca_id')
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
        return jwt_data.get('finca_type')
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
        return jwt_data.get('role')
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
            'finca_id': jwt_data.get('finca_id'),
            'finca_type': jwt_data.get('finca_type'),
            'role': jwt_data.get('role'),
            'user_id': jwt_data.get('id'),
        }
    except Exception:
        return {
            'finca_id': None,
            'finca_type': None,
            'role': None,
            'user_id': None,
        }


# Modelos que requieren filtrado por finca (isolation tenant)
# NOTA: Esta lista debe coincidir con TENANT_TABLES en la migración
TENANT_MODELS = {
    'Animals',
    'Fields',
    'FoodTypes',
    'AnimalAlert',
    'AnimalAlertConfig',
    'ActivityLog',
    'ActivityDailyAgg',
    'Control',
    'Treatments',
    'Vaccinations',
    'GeneticImprovements',
    'ReproductiveEvent',
    'Offspring',
    'AnimalDiseases',
    'AnimalImages',
    'AnimalFields',
    'InventoryLot',
    'InventoryMovement',
    'MilkProduction',
    'OperationalCost',
    'Tasks',
    'AnimalGroup',
    'PastureAforo',
    'Infrastructure',
    'Transaction',
    'MilkSummary',
    'LivestockSummary',
    'TreatmentMedication',
    'TreatmentVaccine',
    'CropPlot',
    'CropActivity',
    'WaterSource',
    'WaterMeasurement',
    'ClimateRiskAlert',
    'MarketOffer',
    'TechnicalAssistanceRequest',
    'UserLocation',
    'Device',
    'SyncOperation',
    'SyncSession',
    'SyncOperationReceipt',
    'SyncConflict',
    'AttachmentBlob',
    'AnimalHealthHistory',
    'AnimalProductionMetrics',
    'BodyConditionScore',
    'ChatMessage',
    'JoinRequest',
    'LactationCycle',
    'NodeMessage',
    'FarmExpenses',
    'ProductionTarget',
    'SeasonalAdjustment',
    'SiniganRegistrations',
    'ManagementPlan',
    'Vaccines',
    'Medications',
    'Diseases',
    'RouteAdministration',
}


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
    if not is_tenant_model(model_class):
        return query

    # Obtener rol del JWT para permitir bypass a administradores globales
    user_role = get_current_user_role()
    import flask
    
    if finca_id is None:
        finca_id = get_current_finca_id()

    is_admin_check = (
        (flask.has_app_context() and getattr(flask.g, 'is_admin', False))
        or (user_role == 'Administrador' and finca_id is None)
        or not flask.has_request_context()
    )

    if is_admin_check:
        return query

    if finca_id is None:
        finca_id = get_current_finca_id()

    # Si el modelo requiere tenant pero no hay finca_id en el contexto
    if finca_id is None:
        # Si estamos en un flask.request pero NO hay finca_id, bloquear acceso por seguridad
        if flask.has_app_context():
            if hasattr(model_class, 'finca_id'):
                logger.warning(f"Intento de acceso a {model_class.__name__} sin contexto de finca. Bloqueando query.")
                return query.filter(model_class.finca_id == -1)
        return query

    if hasattr(model_class, 'finca_id'):
        return query.filter(model_class.finca_id == finca_id)

    return query
