"""
Configuración de rate limiting para la aplicación.
"""

import flask
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_limiter import Limiter

from app.utils.response_handler import APIResponse
from app.utils.security_logger import log_rate_limit_exceeded

import logging

logger = logging.getLogger(__name__)
_RATE_LIMITER_STORAGE_OK = None
_GLOBAL_LIMITER = None


def get_user_id():
    """Obtener ID de usuario para rate limiting personalizado."""
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        # Fallback a IP (considerando proxy forwarding) cuando no hay usuario autenticado.
        return user_id if user_id else get_remote_address_with_forwarded()
    except Exception:
        return get_remote_address_with_forwarded()


def get_remote_address_with_forwarded():
    """Obtener dirección IP considerando proxy forwarding."""
    forwarded_ip = flask.request.environ.get("HTTP_X_FORWARDED_FOR")
    if forwarded_ip:
        return forwarded_ip.split(",")[0].strip()
    return flask.request.environ.get("REMOTE_ADDR", "127.0.0.1")


def rate_limit_handler(request_limit):
    """Handler personalizado para límites excedidos (respuesta estandarizada)."""
    endpoint = flask.request.endpoint or "unknown"
    user_id = get_user_id()

    limit_str = ""
    try:
        if request_limit is None:
            limit_str = ""
        else:
            # flask.Flask-Limiter suele pasar un objeto Limit; str() puede ser vacío en algunos casos.
            limit_str = str(request_limit) or ""
            if not limit_str:
                for attr in ("limit", "limit_string", "raw", "key", "amount"):
                    v = getattr(request_limit, attr, None)
                    if v:
                        limit_str = str(v)
                        break
    except Exception:
        limit_str = ""

    try:
        log_rate_limit_exceeded(endpoint=endpoint, limit=limit_str, user_identifier=user_id)
    except Exception:
        logger.exception("Fallo al registrar evento de rate limit")

    logger.warning("Rate limit exceeded for %s on %s", user_id, endpoint)

    payload, status = APIResponse.error(
        message="Límite de solicitudes excedido",
        status_code=429,
        error_code="RATE_LIMIT_EXCEEDED",
        details={
            "limit": limit_str,
            "endpoint": endpoint,
            "retry_after_seconds": 60,
        },
    )
    resp = flask.make_response(flask.jsonify(payload), status)
    resp.headers['Retry-After'] = '60'
    resp.headers['RateLimit-Reset'] = '60'
    return resp


def init_rate_limiter(app):
    global _GLOBAL_LIMITER, _RATE_LIMITER_STORAGE_OK
    if _GLOBAL_LIMITER is not None:
        return _GLOBAL_LIMITER
    storage_uri = app.config.get("RATE_LIMIT_STORAGE_URI")

    if not storage_uri:
        limiter = Limiter(
            app=app,
            # Key por usuario autenticado cuando exista (evita colisiones detrás de NAT),
            # con fallback a IP.
            key_func=get_user_id,
            default_limits=["50000 per day", "5000 per hour", "500 per minute", "50 per second"],
            on_breach=rate_limit_handler,
            storage_uri="memory://",
            headers_enabled=True,
            swallow_errors=True,
            in_memory_fallback_enabled=True,
            enabled=not app.config.get("TESTING", False),
        )
        app.logger.info("Rate limiter inicializado con storage: memory:// (sin configuración de REDIS_URL)")
        _GLOBAL_LIMITER = limiter
        return limiter

    if _RATE_LIMITER_STORAGE_OK is None:
        try:
            from .redis_client import make_redis_client
            redis_client = make_redis_client(storage_uri)
            redis_client.ping()
            _RATE_LIMITER_STORAGE_OK = True
        except Exception as e:
            app.logger.warning("Rate limiter Redis '%s' falló: %s. Reintentando con memory://", storage_uri, e)
            _RATE_LIMITER_STORAGE_OK = False

    if _RATE_LIMITER_STORAGE_OK:
        limiter = Limiter(
            app=app,
            key_func=get_user_id,
            default_limits=["50000 per day", "5000 per hour", "500 per minute", "50 per second"],
            on_breach=rate_limit_handler,
            storage_uri=storage_uri,
            headers_enabled=True,
            swallow_errors=True,
            in_memory_fallback_enabled=True,
            enabled=not app.config.get('TESTING', False),
        )
        app.logger.info("Rate limiter inicializado con storage Redis: %s", storage_uri)
        _GLOBAL_LIMITER = limiter
        return limiter
    else:
        limiter = Limiter(
            app=app,
            key_func=get_user_id,
            default_limits=["50000 per day", "5000 per hour", "500 per minute", "50 per second"],
            on_breach=rate_limit_handler,
            storage_uri="memory://",
            headers_enabled=True,
            swallow_errors=True,
            in_memory_fallback_enabled=True,
            enabled=not app.config.get("TESTING", False),
        )
        app.logger.info("Rate limiter inicializado con storage: memory:// (fallback)")
        _GLOBAL_LIMITER = limiter
        return limiter


RATE_LIMIT_CONFIG = {
    "auth": {
        "login": "50 per minute",
        "refresh": "100 per minute",
        "logout": "150 per minute",
        "change_password": "50 per hour",
        "recover": "20 per hour",
        "reset": "20 per hour",
    },
    "users": {"create": "50 per hour", "read": "300 per minute", "update": "500 per hour", "delete": "100 per hour"},
    "animals": {"create": "500 per hour", "read": "300 per minute", "update": "1000 per hour", "delete": "200 per hour"},
    "fields": {"create": "200 per hour", "read": "200 per minute", "update": "400 per hour", "delete": "100 per hour"},
    "inventory": {"create": "300 per hour", "read": "250 per minute", "update": "600 per hour", "delete": "150 per hour"},
    "activity": {
        "summary": "500 per minute",
        "stats": "500 per minute",
        "filters": "300 per minute",
    },
    "general": {"read": "2000 per hour", "write": "500 per hour", "admin": "5000 per hour"},
}
