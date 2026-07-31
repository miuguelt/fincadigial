import flask
"""Cache helpers for namespace_helpers — extracted to reduce file size."""
from collections import OrderedDict
from typing import Any
import logging
import time
from datetime import datetime
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from flask_jwt_extended.exceptions import NoAuthorizationError

logger = logging.getLogger(__name__)

# Versión de la API para headers
API_VERSION = "1.0.0"

MAX_CACHE_ENTRIES_PER_MODEL = 1000
MAX_TOTAL_CACHE_SIZE_MB = 100

class LRUCache:
    """Cache LRU (Least Recently Used) con límite de tamaño.

    Evita memory leaks manteniendo solo las entradas más recientes.
    Cuando se alcanza el límite, elimina las entradas más antiguas.
    """

    def __init__(self, max_size=1000):
        self.cache = OrderedDict()
        self.max_size = max_size
        self.hits = 0
        self.misses = 0

    def get(self, key):
        """Obtener valor y mover al final (más reciente)."""
        if key in self.cache:
            self.hits += 1
            # Mover al final (más reciente)
            self.cache.move_to_end(key)
            return self.cache[key]
        self.misses += 1
        return None

    def set(self, key, value):
        """Guardar valor y aplicar política LRU si es necesario."""
        if key in self.cache:
            # Actualizar valor existente
            self.cache.move_to_end(key)
            self.cache[key] = value
        else:
            # Nuevo valor
            self.cache[key] = value
            # Aplicar límite de tamaño
            if len(self.cache) > self.max_size:
                # Eliminar el más antiguo (primero en OrderedDict)
                oldest_key = next(iter(self.cache))
                del self.cache[oldest_key]
                logger.debug("LRU eviction: removed oldest cache entry")

    def clear(self):
        """Limpiar todo el caché."""
        self.cache.clear()

    def size(self):
        """Tamaño actual del caché."""
        return len(self.cache)

    def stats(self):
        """Estadísticas del caché."""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': f'{hit_rate:.1f}%'
        }


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
_INVALIDATION_ACTION = 'cache_invalidate'


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
        bus.publish_payload({
            'endpoint': model_name,
            'action': _INVALIDATION_ACTION,
            'model': model_name,
            'timestamp': time.time(),
        })
    except Exception:
        logger.debug("No se pudo propagar la invalidación de caché", exc_info=True)


def invalidate_from_event(payload: Any) -> bool:
    """Invalida la caché local a partir de un evento del bus (otro worker).

    Se ejecuta en el hilo listener del bus, sin contexto de aplicación: sólo
    toca diccionarios en memoria. Devuelve True si invalidó algo.
    """
    try:
        if isinstance(payload, bytes):
            payload = payload.decode('utf-8')
        if isinstance(payload, str):
            import json
            payload = json.loads(payload)
        if not isinstance(payload, dict):
            return False
        action = payload.get('action')
        if action not in ('create', 'update', 'delete', _INVALIDATION_ACTION):
            return False
        model_name = payload.get('model') or resolve_model_name(payload.get('endpoint'))
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
    cache_config = getattr(model_class, '_cache_config', {})
    cache_type = cache_config.get('type', 'private')

    if cache_type == 'public':
        return base_key

    # Para caché privada, incluir user_id en la key
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            return f"user:{user_id}:{base_key}"
    except (NoAuthorizationError, Exception):
        pass

    return f"anonymous:{base_key}"


def _get_cache_ttl(model_class) -> int:
    """Obtiene el TTL configurado para un modelo."""
    cache_config = getattr(model_class, '_cache_config', {})
    return cache_config.get('ttl', 120)  # 2 minutos por defecto


def _cache_get(model_name: str, key: str, model_class, *, allow_stale: bool = False, allow_stale_seconds: int = 0):
    """Obtiene valor de caché con TTL configurable por modelo y opción de usar stale (offline)."""
    if model_name not in _LIST_CACHE:
        return (None, False)

    lru_cache = _LIST_CACHE[model_name]
    full_key = _get_cache_key_with_user(model_name, key, model_class)
    entry = lru_cache.get(full_key)

    if not entry:
        return (None, False)

    ttl = _get_cache_ttl(model_class)
    age = time.time() - entry['ts']
    if age > ttl:
        if allow_stale and age <= (ttl + allow_stale_seconds):
            return (entry['value'], True)
        return (None, False)

    return (entry['value'], False)


def _cache_set(model_name: str, key: str, value: Any, model_class):
    """Guarda valor en caché con segmentación por usuario."""
    # Crear LRUCache si no existe para este modelo
    if model_name not in _LIST_CACHE:
        _LIST_CACHE[model_name] = LRUCache(max_size=MAX_CACHE_ENTRIES_PER_MODEL)

    lru_cache = _LIST_CACHE[model_name]
    full_key = _get_cache_key_with_user(model_name, key, model_class)
    lru_cache.set(full_key, {'value': value, 'ts': time.time()})


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
        logger.info(f"Cache cleared for model {model_name}: {num_entries} entries invalidated")
    if model_name in _DETAIL_CACHE:
        lru_cache = _DETAIL_CACHE[model_name]
        num_entries = lru_cache.size()
        lru_cache.clear()
        logger.info(f"Detail cache cleared for model {model_name}: {num_entries} entries invalidated")


def _detail_cache_get(model_name: str, record_id: int, model_class, *, allow_stale: bool = False, allow_stale_seconds: int = 0):
    """Obtiene valor de caché para detalle con opción de usar stale."""
    if model_name not in _DETAIL_CACHE:
        return (None, False)
    lru_cache = _DETAIL_CACHE[model_name]
    full_key = _get_cache_key_with_user(model_name, str(record_id), model_class)
    entry = lru_cache.get(full_key)
    if not entry:
        return (None, False)
    ttl = _get_cache_ttl(model_class)
    age = time.time() - entry['ts']
    if age > ttl:
        if allow_stale and age <= (ttl + allow_stale_seconds):
            return (entry['value'], True)
        return (None, False)
    return (entry['value'], False)


def _detail_cache_set(model_name: str, record_id: int, value: Any, model_class):
    """Guarda detalle en cache con segmentación por usuario."""
    if model_name not in _DETAIL_CACHE:
        _DETAIL_CACHE[model_name] = LRUCache(max_size=MAX_CACHE_ENTRIES_PER_MODEL)
    lru_cache = _DETAIL_CACHE[model_name]
    full_key = _get_cache_key_with_user(model_name, str(record_id), model_class)
    lru_cache.set(full_key, {'value': value, 'ts': time.time()})


def _detail_cache_clear(model_name: str, record_id: int | None = None):
    """Invalida caché de detalle de un modelo, opcionalmente solo un ID."""
    if model_name not in _DETAIL_CACHE:
        return
    lru_cache = _DETAIL_CACHE[model_name]
    if record_id is None:
        lru_cache.clear()
        logger.info(f"Detail cache cleared for model {model_name}")
        return
    full_key_prefix = "user:"  # se limpia por user y anónimo
    keys_to_delete = []
    for k in list(lru_cache.cache.keys()):
        if k.endswith(f":{record_id}") or k.split(':')[-1] == str(record_id):
            keys_to_delete.append(k)
    for k in keys_to_delete:
        lru_cache.cache.pop(k, None)


def _generate_cache_headers(model_class, max_updated_at=None) -> dict[str, str]:
    """Genera headers HTTP de caché optimizados para PWA."""
    cache_config = getattr(model_class, '_cache_config', {})
    headers = {}

    # X-API-Version para versionado
    headers['X-API-Version'] = API_VERSION

    # Cache-Control header
    cache_type = cache_config.get('type', 'private')
    max_age = cache_config.get('max_age', 120)
    stale_while_revalidate = cache_config.get('stale_while_revalidate', 60)
    stale_if_error = cache_config.get('stale_if_error', 0)

    cache_control_parts = [cache_type, f'max-age={max_age}']

    if stale_while_revalidate > 0:
        cache_control_parts.append(f'stale-while-revalidate={stale_while_revalidate}')
    if stale_if_error > 0:
        cache_control_parts.append(f'stale-if-error={stale_if_error}')

    headers['Cache-Control'] = ', '.join(cache_control_parts)

    # Last-Modified header basado en el registro más reciente
    if max_updated_at:
        if isinstance(max_updated_at, str):
            try:
                max_updated_at = datetime.fromisoformat(max_updated_at.replace('Z', '+00:00'))
            except:
                pass
        if isinstance(max_updated_at, datetime):
            # Formato HTTP date (RFC 7231)
            headers['Last-Modified'] = max_updated_at.strftime('%a, %d %b %Y %H:%M:%S GMT')

    # X-Cache-Strategy hint para Service Workers
    strategy = cache_config.get('strategy', 'stale-while-revalidate')
    headers['X-Cache-Strategy'] = strategy
    if stale_if_error:
        headers['X-Stale-If-Error'] = str(stale_if_error)

    # Vary header para indicar que la respuesta puede variar según el usuario
    if cache_type == 'private':
        headers['Vary'] = 'Authorization, Cookie'
    else:
        headers['Vary'] = 'Accept-Encoding'

    return headers


def _check_conditional_request(etag: str, last_modified: str | None = None) -> bool:
    """Verifica si se debe retornar 304 Not Modified."""
    # Verificar If-None-Match (ETag)
    if_none_match = flask.request.headers.get('If-None-Match')
    if if_none_match and etag:
        # Puede contener múltiples ETags separados por coma
        client_etags = [tag.strip() for tag in if_none_match.split(',')]
        if etag in client_etags or f'W/{etag}' in client_etags:
            return True

    # Verificar If-Modified-Since
    if_modified_since = flask.request.headers.get('If-Modified-Since')
    if if_modified_since and last_modified:
        try:
            client_date = datetime.strptime(if_modified_since, '%a, %d %b %Y %H:%M:%S GMT')
            server_date = datetime.strptime(last_modified, '%a, %d %b %Y %H:%M:%S GMT')
            if server_date <= client_date:
                return True
        except:
            pass

    return False

