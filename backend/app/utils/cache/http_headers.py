"""HTTP cache headers for PWA/Service-Worker revalidation.

Extracted from ``cache_helpers``: this is the HTTP presentation concern of the
cache (headers, ETag, 304 conditional requests), independent from the in-memory
store and the event-bus invalidation.
"""

import flask
from datetime import datetime

# Versión de la API para headers
API_VERSION = "1.0.0"


def _generate_cache_headers(model_class, max_updated_at=None) -> dict[str, str]:
    """Genera headers HTTP de caché optimizados para PWA."""
    cache_config = getattr(model_class, "_cache_config", {})
    headers = {}

    # X-API-Version para versionado
    headers["X-API-Version"] = API_VERSION

    # Cache-Control header
    cache_type = cache_config.get("type", "private")
    max_age = cache_config.get("max_age", 0)
    stale_while_revalidate = cache_config.get("stale_while_revalidate", 0)
    stale_if_error = cache_config.get("stale_if_error", 0)

    if max_age <= 0:
        cache_control_parts = [cache_type, "no-cache", "must-revalidate"]
    else:
        cache_control_parts = [cache_type, f"max-age={max_age}"]
        if stale_while_revalidate > 0:
            cache_control_parts.append(f"stale-while-revalidate={stale_while_revalidate}")

    if stale_if_error > 0:
        cache_control_parts.append(f"stale-if-error={stale_if_error}")

    headers["Cache-Control"] = ", ".join(cache_control_parts)

    # Last-Modified header basado en el registro más reciente
    if max_updated_at:
        if isinstance(max_updated_at, str):
            try:
                max_updated_at = datetime.fromisoformat(
                    max_updated_at.replace("Z", "+00:00")
                )
            except:
                pass
        if isinstance(max_updated_at, datetime):
            # Formato HTTP date (RFC 7231)
            headers["Last-Modified"] = max_updated_at.strftime(
                "%a, %d %b %Y %H:%M:%S GMT"
            )

    # X-Cache-Strategy hint para Service Workers
    strategy = cache_config.get("strategy", "stale-while-revalidate")
    headers["X-Cache-Strategy"] = strategy
    if stale_if_error:
        headers["X-Stale-If-Error"] = str(stale_if_error)

    # Vary header para indicar que la respuesta puede variar según el usuario
    if cache_type == "private":
        headers["Vary"] = "Authorization, Cookie"
    else:
        headers["Vary"] = "Accept-Encoding"

    return headers


def _check_conditional_request(etag: str, last_modified: str | None = None) -> bool:
    """Verifica si se debe retornar 304 Not Modified."""
    # Verificar If-None-Match (ETag)
    if_none_match = flask.request.headers.get("If-None-Match")
    if if_none_match and etag:
        # Puede contener múltiples ETags separados por coma
        client_etags = [tag.strip() for tag in if_none_match.split(",")]
        if etag in client_etags or f"W/{etag}" in client_etags:
            return True

    # Verificar If-Modified-Since
    if_modified_since = flask.request.headers.get("If-Modified-Since")
    if if_modified_since and last_modified:
        try:
            client_date = datetime.strptime(
                if_modified_since, "%a, %d %b %Y %H:%M:%S GMT"
            )
            server_date = datetime.strptime(last_modified, "%a, %d %b %Y %H:%M:%S GMT")
            if server_date <= client_date:
                return True
        except:
            pass

    return False
