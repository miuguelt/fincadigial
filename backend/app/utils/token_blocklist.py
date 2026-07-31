"""
Utilidades para revocar tokens JWT usando el sistema de cache ya inicializado.
"""
import logging
import time
from datetime import timedelta

import flask

logger = logging.getLogger(__name__)

_CACHE_PREFIX = "jwt:block:"
_fallback_blocklist = {}


def _get_cache():
    """Obtiene la instancia de cache inicializada sin causar import circular."""
    try:
        from app import cache as app_cache
        return app_cache
    except Exception:
        pass
    try:
        # Fallback: buscar en extensiones
        if flask.current_app and flask.current_app.extensions:
            return flask.current_app.extensions.get("cache")
    except Exception:
        pass
    return None


def _cache_timeout_for(decoded_token: dict) -> int:
    """Calcula un TTL razonable para la entrada de cache segun exp o configuracion."""
    try:
        exp_ts = decoded_token.get("exp")
        if exp_ts:
            remaining = int(exp_ts - time.time())
            if remaining > 0:
                return remaining
        token_type = decoded_token.get("type")
        delta = None
        if flask.current_app:
            if token_type == "refresh":
                delta = flask.current_app.config.get("JWT_REFRESH_TOKEN_EXPIRES")
            else:
                delta = flask.current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES")
        if isinstance(delta, timedelta):
            return max(int(delta.total_seconds()), 60)
    except Exception:
        logger.debug("No se pudo calcular TTL exacto para token revocado", exc_info=True)
    return 3600  # fallback conservador


def _build_cache_key(jti: str) -> str:
    return f"{_CACHE_PREFIX}{jti}"


def _cleanup_fallback():
    """Limpia entradas expiradas del blocklist en memoria."""
    now = time.time()
    expired = [jti for jti, exp in _fallback_blocklist.items() if exp <= now]
    for jti in expired:
        _fallback_blocklist.pop(jti, None)


def mark_token_revoked(decoded_token: dict | None) -> bool:
    """Guarda el jti del token como revocado en la cache con TTL."""
    if not decoded_token or not isinstance(decoded_token, dict):
        return False
    jti = decoded_token.get("jti")
    if not jti:
        return False
    cache = _get_cache()
    timeout = _cache_timeout_for(decoded_token)
    if not cache:
        # Fallback en memoria si no hay cache configurado (mejor que no revocar)
        expires_at = time.time() + timeout
        _fallback_blocklist[jti] = expires_at
        _cleanup_fallback()
        logger.warning("Cache no disponible; usando blocklist en memoria para jti=%s", jti)
        return True
    try:
        cache.set(_build_cache_key(jti), True, timeout=timeout)
        logger.info("Token revocado registrado en cache (jti=%s, ttl=%ss)", jti, timeout)
        return True
    except Exception:
        logger.exception("No se pudo marcar el token como revocado en cache (jti=%s)", jti)
        return False


def is_token_revoked(decoded_token: dict) -> bool:
    """Retorna True si el jti está en la lista de revocados."""
    try:
        jti = decoded_token.get("jti")
        if not jti:
            return False
        cache = _get_cache()
        if not cache:
            _cleanup_fallback()
            return jti in _fallback_blocklist
        return bool(cache.get(_build_cache_key(jti)))
    except Exception as exc:
        err_msg = str(exc)
        err_type = type(exc).__name__
        is_network = ("timeout" in err_type.lower() or "connection" in err_type.lower() or "10061" in err_msg)
        if is_network:
            logger.warning("Error de conexion al verificar token revocado (%s: %s). Permitiendo acceso por fail-safe.", err_type, err_msg)
        else:
            logger.exception("Error inesperado verificando si el token fue revocado")
        # Regla Global / SSoT: Fail-safe para operacion de seguridad.
        # Es mejor permitir un token potencialmente revocado que tumbar a todos si Redis cae.
        return False
