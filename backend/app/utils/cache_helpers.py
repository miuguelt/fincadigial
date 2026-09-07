"""In-memory cache store with per-model segments and cross-worker invalidation.

Responsibility is kept narrow: key derivation, TTL, LRU list/detail stores, and
invalidation over the event bus. HTTP/PWA header concerns live in
``app.utils.cache.http_headers``; the LRU eviction policy in
``app.utils.cache.lru_cache``. Public symbols are re-exported here so existing
importers (``namespace_helpers.legacy``, ``api.sse``, namespaces and tests) keep
working without changes.
"""

import flask
from typing import Any
import logging
import time
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from flask_jwt_extended.exceptions import NoAuthorizationError

from app.utils.cache.lru_cache import LRUCache
from app.utils.cache.http_headers import (
    API_VERSION,
    _generate_cache_headers,
    _check_conditional_request,
)

logger = logging.getLogger(__name__)

MAX_CACHE_ENTRIES_PER_MODEL = 1000
MAX_TOTAL_CACHE_SIZE_MB = 100


# Cache global: cada modelo tiene su propio LRUCache
_LIST_CACHE: dict[str, LRUCache] = {}
_DETAIL_CACHE: dict[str, LRUCache] = {}

# Mapa endpoint (nombre del namespace) -> nombre del modelo.
# Los eventos del bus viajan con el nombre del endpoint ('animals'), mientras
# que la caché se indexa por el nombre de la clase ('Animals'). Sin este mapa
# un worker no sabría qué caché local invalidar al recibir el evento de otro.
_ENDPOINT_TO_MODEL: dict[str, str] = {}

# Acción dedicada para invalidaciones que no nacen de un CRUD del namespace
# (servicios que limpian modelos relacionados). Los clientes SSE la ignoran.
_INVALIDATION_ACTION = "cache_invalidate"


def register_cache_endpoint(endpoint: str, model_name: str) -> None:
    """Registra la correspondencia endpoint -> modelo para invalidación remota."""
    if endpoint and model_name:
        _ENDPOINT_TO_MODEL[str(endpoint).lower()] = model_name


def resolve_model_name(endpoint: str) -> str | None:
    """Devuelve el nombre del modelo asociado a un endpoint del bus de eventos."""
    if not endpoint:
        return None
    key = str(endpoint).lower()
    if key in _ENDPOINT_TO_MODEL:
        return _ENDPOINT_TO_MODEL[key]
    # Fallback: el emisor pudo publicar directamente el nombre del modelo.
    for model_name in list(_LIST_CACHE.keys()) + list(_DETAIL_CACHE.keys()):
        if model_name.lower() == key:
            return model_name
    return None


def _broadcast_invalidation(model_name: str) -> None:
    """Avisa al resto de workers que deben limpiar la caché de un modelo.

    Best-effort: sin app context, sin bus o sin Redis simplemente no se emite
    (con un solo proceso la limpieza local ya es suficiente).
    """
    try:
        if not flask.has_app_context():
            return
        bus = flask.current_app.extensions.get("event_bus")
        if not bus:
            return
        bus.publish_payload(
            {
                "endpoint": model_name,
                "action": _INVALIDATION_ACTION,
                "model": model_name,
                "timestamp": time.time(),
            }
        )
    except Exception:
        logger.debug("No se pudo propagar la invalidación de caché", exc_info=True)


def invalidate_from_event(payload: Any) -> bool:
    """Invalida la caché local a partir de un evento del bus (otro worker).

    Se ejecuta en el hilo listener del bus, sin contexto de aplicación: sólo
    toca diccionarios en memoria. Devuelve True si invalidó algo.
    """
    try:
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8")
        if isinstance(payload, str):
            import json

            payload = json.loads(payload)
        if not isinstance(payload, dict):
            return False
        action = payload.get("action")
        if action not in ("create", "update", "delete", _INVALIDATION_ACTION):
            return False
        model_name = payload.get("model") or resolve_model_name(payload.get("endpoint") or "")
        if not model_name:
            return False
        # Limpieza local únicamente: reemitir aquí provocaría un bucle de eventos.
        _cache_clear_local(model_name)
        return True
    except Exception:
        logger.debug("No se pudo invalidar caché desde evento del bus", exc_info=True)
        return False


def _get_cache_key_with_user(model_name: str, base_key: str, model_class) -> str:
    """Genera una cache key incluyendo user_id si el modelo es privado."""
    cache_config = getattr(model_class, "_cache_config", {})
    cache_type = cache_config.get("type", "private")

    if cache_type == "public":
        return base_key

    # Para caché privada, incluir user_id en la key
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            jwt_data = get_jwt() or {}
            finca_id = jwt_data.get("finca_id") or "none"
            return f"user:{user_id}:finca:{finca_id}:{base_key}"
    except (NoAuthorizationError, Exception):
        pass

    return f"anonymous:{base_key}"


def _get_cache_ttl(model_class) -> int:
    """Obtiene el TTL configurado para un modelo."""
    cache_config = getattr(model_class, "_cache_config", {})
    return cache_config.get("ttl", 30)  # 30 segundos por defecto


def _cache_get(
    model_name: str,
    key: str,
    model_class,
    *,
    allow_stale: bool = False,
    allow_stale_seconds: int = 0,
):
    """Obtiene valor de caché con TTL configurable por modelo y opción de usar stale (offline)."""
    if model_name not in _LIST_CACHE:
        return (None, False)

    lru_cache = _LIST_CACHE[model_name]
    full_key = _get_cache_key_with_user(model_name, key, model_class)
    entry = lru_cache.get(full_key)

    if not entry:
        return (None, False)

    ttl = _get_cache_ttl(model_class)
    age = time.time() - entry["ts"]
    if age > ttl:
        if allow_stale and age <= (ttl + allow_stale_seconds):
            return (entry["value"], True)
        return (None, False)

    return (entry["value"], False)


def _cache_set(model_name: str, key: str, value: Any, model_class):
    """Guarda valor en caché con segmentación por usuario."""
    # Crear LRUCache si no existe para este modelo
    if model_name not in _LIST_CACHE:
        _LIST_CACHE[model_name] = LRUCache(max_size=MAX_CACHE_ENTRIES_PER_MODEL)

    lru_cache = _LIST_CACHE[model_name]
    full_key = _get_cache_key_with_user(model_name, key, model_class)
    lru_cache.set(full_key, {"value": value, "ts": time.time()})


def _cache_clear(model_name: str):
    """Invalida toda la cache de un modelo específico.

    Limpia TODAS las variantes de caché incluyendo:
    - Cache por usuario (user:{id}:...)
    - Cache anónima (anonymous:...)
    - Cache pública

    Esto garantiza que TODOS los usuarios vean datos actualizados
    después de CREATE/UPDATE/DELETE, también cuando la escritura la atendió
    otro worker de gunicorn (la invalidación viaja por el bus de eventos).
    """
    _cache_clear_local(model_name)
    _broadcast_invalidation(model_name)


def _cache_clear_local(model_name: str):
    """Limpia la caché de este proceso, sin propagar el evento."""
    if model_name in _LIST_CACHE:
        lru_cache = _LIST_CACHE[model_name]
        num_entries = lru_cache.size()
        lru_cache.clear()
        logger.info(
            f"Cache cleared for model {model_name}: {num_entries} entries invalidated"
        )
    if model_name in _DETAIL_CACHE:
        lru_cache = _DETAIL_CACHE[model_name]
        num_entries = lru_cache.size()
        lru_cache.clear()
        logger.info(
            f"Detail cache cleared for model {model_name}: {num_entries} entries invalidated"
        )


def _detail_cache_get(
    model_name: str,
    record_id: int,
    model_class,
    *,
    allow_stale: bool = False,
    allow_stale_seconds: int = 0,
):
    """Obtiene valor de caché para detalle con opción de usar stale."""
    if model_name not in _DETAIL_CACHE:
        return (None, False)
    lru_cache = _DETAIL_CACHE[model_name]
    full_key = _get_cache_key_with_user(model_name, str(record_id), model_class)
    entry = lru_cache.get(full_key)
    if not entry:
        return (None, False)
    ttl = _get_cache_ttl(model_class)
    age = time.time() - entry["ts"]
    if age > ttl:
        if allow_stale and age <= (ttl + allow_stale_seconds):
            return (entry["value"], True)
        return (None, False)
    return (entry["value"], False)


def _detail_cache_set(model_name: str, record_id: int, value: Any, model_class):
    """Guarda detalle en cache con segmentación por usuario."""
    if model_name not in _DETAIL_CACHE:
        _DETAIL_CACHE[model_name] = LRUCache(max_size=MAX_CACHE_ENTRIES_PER_MODEL)
    lru_cache = _DETAIL_CACHE[model_name]
    full_key = _get_cache_key_with_user(model_name, str(record_id), model_class)
    lru_cache.set(full_key, {"value": value, "ts": time.time()})


def _detail_cache_clear(model_name: str, record_id: int | None = None):
    """Invalida caché de detalle de un modelo, opcionalmente solo un ID."""
    if model_name not in _DETAIL_CACHE:
        return
    lru_cache = _DETAIL_CACHE[model_name]
    if record_id is None:
        lru_cache.clear()
        logger.info(f"Detail cache cleared for model {model_name}")
        return
    keys_to_delete = []
    for k in list(lru_cache.cache.keys()):
        if k.endswith(f":{record_id}") or k.split(":")[-1] == str(record_id):
            keys_to_delete.append(k)
    for k in keys_to_delete:
        lru_cache.cache.pop(k, None)


__all__ = [
    "LRUCache",
    "API_VERSION",
    "MAX_CACHE_ENTRIES_PER_MODEL",
    "MAX_TOTAL_CACHE_SIZE_MB",
    "_LIST_CACHE",
    "_DETAIL_CACHE",
    "_ENDPOINT_TO_MODEL",
    "_INVALIDATION_ACTION",
    "register_cache_endpoint",
    "resolve_model_name",
    "_broadcast_invalidation",
    "invalidate_from_event",
    "_get_cache_key_with_user",
    "_get_cache_ttl",
    "_cache_get",
    "_cache_set",
    "_cache_clear",
    "_cache_clear_local",
    "_detail_cache_get",
    "_detail_cache_set",
    "_detail_cache_clear",
    "_generate_cache_headers",
    "_check_conditional_request",
]
