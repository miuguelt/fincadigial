"""
namespace_helpers — Paquete de helpers CRUD optimizados.

Actualmente en migración desde el monolito legacy.py hacia módulos separados.
"""

from app.utils.namespace_helpers.legacy import (
    create_optimized_namespace,
    _cache_clear,
    _cache_set,
    _cache_get,
    _detail_cache_get,
    _detail_cache_set,
    _detail_cache_clear,
    _generate_cache_headers,
    _check_conditional_request,
    _validate_sql_identifier,
    _field_definitions_for_model,
    _build_models,
    _parse_bool,
    _etag_scope,
    _scoped_etag,
    API_VERSION,
)

__all__ = [
    "create_optimized_namespace",
    "_cache_clear",
    "_cache_set",
    "_cache_get",
    "_detail_cache_get",
    "_detail_cache_set",
    "_detail_cache_clear",
    "_generate_cache_headers",
    "_check_conditional_request",
    "_validate_sql_identifier",
    "_field_definitions_for_model",
    "_build_models",
    "_parse_bool",
    "_etag_scope",
    "_scoped_etag",
    "API_VERSION",
]
