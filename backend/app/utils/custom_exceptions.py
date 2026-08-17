"""
Excepciones personalizadas estandarizadas para el Backend de Finca Villa Luz.
Estas excepciones son capturadas centralizadamente por app/utils/error_handlers.py.
"""


class BusinessRuleException(Exception):
    """Excepción para violaciones de reglas de negocio (HTTP 400 por defecto)."""

    def __init__(
        self,
        message,
        status_code=400,
        error_code="BUSINESS_RULE_VIOLATION",
        details=None,
    ):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}


class ResourceNotFoundException(Exception):
    """Excepción para recursos no encontrados (HTTP 404)."""

    def __init__(
        self, message="Recurso no encontrado", resource_name=None, resource_id=None
    ):
        super().__init__(message)
        self.message = message
        self.resource_name = resource_name
        self.resource_id = resource_id


class ForbiddenException(Exception):
    """Excepción para acceso prohibido / falta de permisos (HTTP 403)."""

    def __init__(self, message="No tienes permisos para realizar esta acción"):
        super().__init__(message)
        self.message = message


class UnauthorizedException(Exception):
    """Excepción para acceso no autorizado / credenciales inválidas (HTTP 401)."""

    def __init__(self, message="Credenciales inválidas o token expirado"):
        super().__init__(message)
        self.message = message


class ConflictException(Exception):
    """Excepción para conflictos de datos o estado del recurso (HTTP 409)."""

    def __init__(self, message="Conflicto con el estado actual del recurso"):
        super().__init__(message)
        self.message = message
