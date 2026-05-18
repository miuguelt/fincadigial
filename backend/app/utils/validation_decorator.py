"""
Decorador de validación estandarizado para todos los endpoints.
"""

from functools import wraps
import flask
from marshmallow import Schema, ValidationError
from app.utils.response_handler import APIResponse
import logging

logger = logging.getLogger(__name__)

def validate_request(schema_class=None, validate_json=True, validate_args=False):
    """
    Decorador para validar requests de manera estandarizada.
    
    Args:
        schema_class: Clase Schema de Marshmallow para validación
        validate_json: Si se debe validar el cuerpo JSON
        validate_args: Si se deben validar los argumentos de query
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Validar JSON body si se solicita
                if validate_json and schema_class:
                    if not flask.request.is_json:
                        return APIResponse.error(
                            message="Content-Type debe ser application/json",
                            status_code=400,
                            error_code="INVALID_CONTENT_TYPE"
                        )
                    
                    json_data = flask.request.get_json()
                    if json_data is None:
                        return APIResponse.error(
                            message="Cuerpo JSON requerido",
                            status_code=400,
                            error_code="JSON_BODY_REQUIRED"
                        )
                    
                    schema = schema_class()
                    try:
                        validated_data = schema.load(json_data)
                        # Agregar datos validados al contexto del flask.request
                        flask.request.validated_data = validated_data
                    except ValidationError as err:
                        return APIResponse.error(
                            message="Datos inválidos",
                            status_code=422,
                            error_code="VALIDATION_ERROR",
                            details={"errors": err.messages}
                        )
                
                # Validar argumentos de query si se solicita
                if validate_args and schema_class:
                    query_args = flask.request.args.to_dict()
                    if query_args:
                        schema = schema_class()
                        try:
                            validated_args = schema.load(query_args)
                            flask.request.validated_args = validated_args
                        except ValidationError as err:
                            return APIResponse.error(
                                message="Argumentos inválidos",
                                status_code=422,
                                error_code="ARGS_VALIDATION_ERROR",
                                details={"errors": err.messages}
                            )
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Error en validación: {str(e)}")
                return APIResponse.error(
                    message="Error de validación interno",
                    status_code=500,
                    error_code="VALIDATION_INTERNAL_ERROR"
                )
        
        return decorated_function
    return decorator


def validate_required_fields(required_fields):
    """
    Decorador para validar campos requeridos básicos.
    
    Args:
        required_fields: Lista de campos requeridos
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                if not flask.request.is_json:
                    return APIResponse.error(
                        message="Content-Type debe ser application/json",
                        status_code=400,
                        error_code="INVALID_CONTENT_TYPE"
                    )
                
                json_data = flask.request.get_json()
                if json_data is None:
                    return APIResponse.error(
                        message="Cuerpo JSON requerido",
                        status_code=400,
                        error_code="JSON_BODY_REQUIRED"
                    )
                
                missing_fields = []
                for field in required_fields:
                    if field not in json_data or json_data[field] is None or json_data[field] == '':
                        missing_fields.append(field)
                
                if missing_fields:
                    return APIResponse.error(
                        message="Campos requeridos faltantes",
                        status_code=400,
                        error_code="REQUIRED_FIELDS_MISSING",
                        details={"missing_fields": missing_fields}
                    )
                
                return f(*args, **kwargs)
                
            except Exception as e:
                logger.error(f"Error en validación de campos requeridos: {str(e)}")
                return APIResponse.error(
                    message="Error de validación interno",
                    status_code=500,
                    error_code="VALIDATION_INTERNAL_ERROR"
                )
        
        return decorated_function
    return decorator


def sanitize_input(f):
    """
    Decorador para sanitizar inputs básicos.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            if flask.request.is_json:
                json_data = flask.request.get_json()
                if json_data:
                    # Sanitizar strings
                    for key, value in json_data.items():
                        if isinstance(value, str):
                            # Trim whitespace
                            json_data[key] = value.strip()
                            # Prevenir script injection básico
                            if '<script' in value.lower() or 'javascript:' in value.lower():
                                return APIResponse.error(
                                    message="Contenido no permitido",
                                    status_code=400,
                                    error_code="INVALID_CONTENT"
                                )
                    
                    flask.request.sanitized_data = json_data
            
            return f(*args, **kwargs)
            
        except Exception as e:
            logger.error(f"Error en sanitización: {str(e)}")
            return APIResponse.error(
                message="Error de procesamiento interno",
                status_code=500,
                error_code="SANITIZATION_ERROR"
            )
    
    return decorated_function


# Schemas básicos para validación común
class PaginationSchema(Schema):
    page = fields.Integer(load_default=1, validate=validate.Range(min=1))
    per_page = fields.Integer(load_default=20, validate=validate.Range(min=1, max=100))


class SearchSchema(Schema):
    search = validate.String(required=False, validate=validate.Length(min=1, max=255))
    field = validate.String(required=False, validate=validate.Length(min=1, max=100))


class IdSchema(Schema):
    id = validate.Integer(required=True, validate=validate.Range(min=1))


# Importar validators de marshmallow
try:
    from marshmallow import validate
except ImportError:
    # Fallback si no está disponible
    class validate:
        @staticmethod
        def Integer(*args, **kwargs):
            return None
        
        @staticmethod
        def String(*args, **kwargs):
            return None
        
        @staticmethod
        def Range(*args, **kwargs):
            return None
        
        @staticmethod
        def Length(*args, **kwargs):
            return None
