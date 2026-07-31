import flask
"""Factory optimizado para creación de namespaces CRUD con mínima repetición.

Mejoras incluidas:
 - Modelos Swagger automáticos (Input / Response / List + meta de paginación)
 - CRUD estándar: GET list (filtros, búsqueda, orden, paginación), POST, GET/<id>, PUT, PATCH, DELETE
 - Endpoint adicional: /bulk (creación masiva), /stats (estadísticas básicas si el modelo las provee)
 - Respuestas consistentes (mantiene compatibilidad con marshal de Flask-RESTX) + APIResponse para errores
 - Filtros (?campo=valor1,valor2) según _filterable_fields
 - Búsqueda (?search=texto) en _searchable_fields
 - Orden (?sort_by=campo&sort_order=asc|desc) restringido a _sortable_fields
 - Relaciones (?include_relations=true)
 - Caché ligera en memoria para listados (TTL corto) desactivable con ?cache_bust=1
 - ETag simple (basado en total + timestamp de actualización más reciente en la página)
 - Preparado para integrar rate limiting (si un decorador externo se inyecta)

Las optimizaciones buscan equilibrio entre simplicidad y funcionalidades útiles sin reintroducir complejidad excesiva.
"""

from flask_restx import Namespace, Resource, fields
from flask import jsonify
from typing import Any
from collections.abc import Callable
from app import db
from app.utils.response_handler import APIResponse
from app.models.base_model import ValidationError
from app.utils.activity_logger import log_activity_event, build_relations_from_instance
from app.utils.rbac import require_permission
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
import logging
import csv
import io
from datetime import UTC

logger = logging.getLogger(__name__)

from app.utils.cache_helpers import (
    _cache_get, _cache_set, _cache_clear,
    _detail_cache_get, _detail_cache_set, _detail_cache_clear,
    _generate_cache_headers, _check_conditional_request,
)

# Versión de la API para headers
API_VERSION = "1.0.0"


def _validate_sql_identifier(name: str) -> None:
    """Valida que un nombre sea un identificador SQL seguro (solo alfanumérico + underscore)."""
    if not name or not isinstance(name, str):
        raise ValueError(f"Invalid SQL identifier: {name!r}")
    if not all(c.isalnum() or c == '_' for c in name):
        raise ValueError(f"SQL identifier contains invalid characters: {name!r}")
    if name[0].isdigit():
        raise ValueError(f"SQL identifier starts with digit: {name!r}")


def _field_definitions_for_model(model_class, exclude: list[str]) -> dict[str, fields.Raw]:
    defs = {}
    model_required = set(getattr(model_class, '_required_fields', []) or [])
    for column in model_class.__table__.columns:
        if column.name in exclude:
            continue
        kwargs = {
            'description': column.name.replace('_', ' ').title(),
            # Align swagger required fields with BaseModel validations when models define _required_fields.
            'required': (column.name in model_required) or (
                not column.nullable and column.default is None and column.name not in ('id',)
            ),
        }
        py_type = getattr(column.type, 'python_type', None)
        # Ensure SQLAlchemy Date/DateTime columns are represented correctly in Swagger/OpenAPI.
        try:
            from sqlalchemy import Date as _SA_Date, DateTime as _SA_DateTime
            if isinstance(column.type, _SA_Date):
                defs[column.name] = fields.Date(**kwargs)
                continue
            if isinstance(column.type, _SA_DateTime):
                defs[column.name] = fields.DateTime(**kwargs)
                continue
        except Exception:
            pass
        if py_type is int:
            defs[column.name] = fields.Integer(**kwargs)
        elif py_type is float:
            defs[column.name] = fields.Float(**kwargs)
        elif py_type is bool:
            defs[column.name] = fields.Boolean(**kwargs)
        elif py_type is str:
            defs[column.name] = fields.String(**kwargs)
        else:
            defs[column.name] = fields.Raw(**kwargs)
    return defs


def _build_models(ns: Namespace, model_class: type):
    # Build base field definitions
    input_fields = _field_definitions_for_model(model_class, exclude=['id', 'created_at', 'updated_at'])
    response_fields = _field_definitions_for_model(model_class, exclude=['password'])

    # If password column exists include it as string in input (optional) but never in response
    if 'password' in model_class.__table__.columns:
        # Respect _required_fields when present (e.g., User.password is required for creation).
        is_required = 'password' in (getattr(model_class, '_required_fields', []) or [])
        input_fields['password'] = fields.String(description='Password (raw, will be hashed)', required=is_required)
        # Ensure enums appear as simple string fields in swagger (adjust existing Raw)
    for fname, col in model_class.__table__.columns.items():
        # Check if it's an enum column (SQLAlchemy Enum type)
        is_enum = (hasattr(col.type, 'enums') or
                  str(col.type).startswith('ENUM') or
                  hasattr(col.type, 'enum_class') or
                  (hasattr(model_class, '_enum_fields') and fname in model_class._enum_fields))

        if is_enum:
            # Replace in input/response if present
            if fname in input_fields:
                enum_values = None
                if hasattr(model_class, '_enum_fields') and fname in model_class._enum_fields:
                    enum_class = model_class._enum_fields[fname]
                    enum_values = [e.value for e in enum_class]
                    description = f"{input_fields[fname].description}. Valores válidos: {', '.join(enum_values)}"
                else:
                    description = input_fields[fname].description
                input_fields[fname] = fields.String(description=description, required=getattr(input_fields[fname], 'required', False))
            if fname in response_fields:
                response_fields[fname] = fields.String(description=response_fields[fname].description, required=False)

    input_model = ns.model(f'{model_class.__name__}Input', input_fields)
    response_model = ns.model(f'{model_class.__name__}Response', response_fields)
    # Modelo de paginación acorde al contrato unificado APIResponse.paginated_success
    pagination_model = ns.model('PaginationMeta', {
        'page': fields.Integer(description='Página actual'),
        'limit': fields.Integer(description='Elementos por página'),
        'total_items': fields.Integer(description='Total de elementos'),
        'total_pages': fields.Integer(description='Total de páginas'),
        'has_next_page': fields.Boolean(description='¿Existe página siguiente?'),
        'has_previous_page': fields.Boolean(description='¿Existe página anterior?'),
    })
    list_model = ns.model(f'{model_class.__name__}List', {
        'success': fields.Boolean(description='Indicador de éxito'),
        'data': fields.List(fields.Nested(response_model), description='Lista paginada de elementos'),
        'meta': fields.Nested(ns.model('ListMeta', {
            'pagination': fields.Nested(pagination_model)
        }), description='Metadatos adicionales (paginación)')
    })
    return input_model, response_model, list_model


def _parse_bool(val: Any, default=False):
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    return str(val).lower() in ('1', 'true', 'yes', 'y')


def _etag_scope(model_class) -> str:
    """Segmenta ETag por usuario/finca para evitar 304 cruzados entre fincas."""
    try:
        cache_config = getattr(model_class, '_cache_config', {}) or {}
        if cache_config.get('type') == 'public':
            return 'public'

        from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
        verify_jwt_in_request(optional=True)
        jwt_data = get_jwt() or {}
        user_id = get_jwt_identity() or 'anonymous'
        finca_id = jwt_data.get('finca_id') or 'none'
        return f'user:{user_id}:finca:{finca_id}'
    except Exception:
        return 'anonymous'


def _scoped_etag(model_class, *parts: Any) -> str:
    safe_parts = [str(part) if part is not None else 'none' for part in parts]
    return f'"{_etag_scope(model_class)}:{"-".join(safe_parts)}"'



def create_optimized_namespace(
    name: str,
    description: str,
    model_class: type,
    path: str | None = None,
    *,
    rbac_entity: str | None = None,
    permissions: dict[str, list[str]] | None = None,
    enable_bulk: bool = True,
    enable_patch: bool = True,
    enable_stats: bool = True,
    cache_enabled: bool = True,
    rate_limit_decorator: Callable | None = None,
    public_create: bool = False,
) -> Namespace:
    """Crear namespace con CRUD auto-registrado para un modelo dado.

    Parámetros avanzados:
      rbac_entity: Nombre de la entidad para RBAC (ej: 'animals'). Si no se provee, se usa 'name'.
      permissions: Dict opcional de permisos custom.
      enable_bulk: habilita POST /bulk para creación masiva.
      enable_patch: habilita PATCH para actualización parcial.
      enable_stats: habilita GET /stats si el modelo expone get_stats().
      cache_enabled: activa caché corta para listados.
      rate_limit_decorator: decorador opcional para aplicar rate limiting a los endpoints.
    """
    ns = Namespace(name=name, description=description, path=path or f'/{name}')
    entity = rbac_entity or name

    input_model, response_model, list_model = _build_models(ns, model_class)
    validation_error_status = getattr(model_class, '_validation_error_status', None)
    is_public_create = public_create or getattr(model_class, '_public_create', False)

    def _maybe_rate_limit(func):
        if rate_limit_decorator:
            return rate_limit_decorator(func)
        return func

    def _format_validation_errors(exc: ValidationError):
        """Normaliza ValidationError a un payload listo para APIResponse.validation_error."""
        errs = getattr(exc, 'errors', None) or exc.message or 'Datos inválidos'
        field = getattr(exc, 'field', None)
        if isinstance(errs, str):
            if field:
                return {field: errs}
            return {'error': errs}
        return errs

    def _validation_error_response(errors):
        """Construye la respuesta de validación respetando overrides por modelo."""
        status_code = validation_error_status if validation_error_status else (400 if is_public_create else 422)
        return APIResponse.validation_error(errors, status_code=status_code)

    def _handle_integrity_error(ie: IntegrityError, action_name: str, record_id: int | None = None):
        db.session.rollback()
        ctx = f"{action_name} {model_class.__name__}"
        if record_id:
            ctx += f" id={record_id}"
        logger.warning(f"Integrity error {ctx}: {ie}", exc_info=True)
        import re
        msg = str(getattr(ie, 'orig', ie))
        value = None
        key_name = None
        m = re.search(r"Duplicate entry '(.+?)' for key '(.+?)'", msg, flags=re.IGNORECASE)
        if m:
            value = m.group(1)
            key_name = m.group(2)
        else:
            m2 = re.search(r"UNIQUE constraint failed: (.+)", msg, flags=re.IGNORECASE)
            if m2:
                key_name = m2.group(1)
            else:
                m3 = re.search(r"llave duplicada viola restricción de unicidad «(.+?)»", msg, flags=re.IGNORECASE)
                if m3:
                    key_name = m3.group(1)
        cols = []
        if key_name:
            try:
                for col in model_class.__table__.columns:
                    if col.name in key_name:
                        cols.append(col.name)
            except Exception:
                pass
            try:
                for c in model_class.__table__.constraints:
                    cname = getattr(c, 'name', '')
                    if cname and cname == key_name and hasattr(c, 'columns'):
                        cols = [col.name for col in c.columns]
                        break
            except Exception:
                pass
        if not cols:
            unique_fields = getattr(model_class, '_unique_fields', []) or []
            for uf in unique_fields:
                if uf in (key_name or '') or uf in msg:
                    cols.append(uf)
        labels = {'email': 'correo', 'identification': 'número de identificación', 'phone': 'teléfono', 'username': 'usuario', 'animal_id': 'animal', 'field_id': 'potrero', 'assignment_date': 'fecha de asignación'}
        if cols:
            if len(cols) == 1:
                field = cols[0]
                label = labels.get(field, field)
                friendly = f"Ya existe un registro con ese {label}. Cambia el {label}."
                return APIResponse.conflict(friendly, details={'conflict': {'field': field, 'label': label, 'value': value, 'key': key_name, 'suggestion': f"Cambia el {label} por otro que no esté registrado."}})
            else:
                friendly_cols = [labels.get(c, c) for c in cols]
                friendly = f"Ya existe un registro con esa combinación de {', '.join(friendly_cols)}. Modifique uno de estos campos."
                return APIResponse.conflict(
                    friendly,
                    details={'conflict': {'fields': cols, 'value': value, 'key': key_name, 'suggestion': "Modifica al menos uno de los campos para que la combinación sea única."}}
                )
        if 'llave duplicada' in msg.lower() or 'duplicate' in msg.lower() or 'unique' in msg.lower():
            return APIResponse.conflict('Ya existe un registro con estos datos únicos. Modifique el registro o la fecha.', details={'error': msg})
        return APIResponse.conflict('Violación de unicidad o integridad', details={'error': msg})

    # Documentar parámetros comunes del listado
    ns.doc(params={
        'page': 'Página (int)',
        'limit': 'Elementos por página (int)',
        'search': 'Texto de búsqueda simple (coincide por texto, ID exacto y fechas)',
        'sort_by': 'Campo para ordenar (alias: sort)',
        'sort_order': 'asc o desc (alias: order)',
        'include_relations': 'true para incluir relaciones configuradas',
        'cache_bust': '1 para ignorar caché',
        'prefer_cache': 'true para usar respuesta en caché incluso expirada (modo offline)',
        'offline_fallback': 'alias de prefer_cache para conexiones inestables',
        'fields': 'Lista de campos separados por coma a incluir en items (ej: id,name,status)',
        'export': 'Exportar formato (csv); si se usa, ignora paginación salvo page/limit explícitos',
        **{
            f: f'Filtro por campo {f}'
            for f in (
                list(getattr(model_class, '_filterable_fields', []))
                + list(getattr(model_class, '_range_filter_fields', {}).keys())
            )
        }
    })
    from flask import make_response as flask_make_response
    class ModelListResource(Resource):
        @ns.doc('list_' + name, description='Listar registros con filtros y paginación (caché ligera / export / selección de campos)')
        @require_permission(entity, 'read')
        @_maybe_rate_limit
        def get(self):  # List
            try:
                args_items = sorted((k, v) for k, v in flask.request.args.items() if k != 'cache_bust')
                cache_key = str(args_items)
                model_key = model_class.__name__
                cache_config = getattr(model_class, '_cache_config', {})
                stale_if_error = cache_config.get('stale_if_error', 0)
                prefer_cache = _parse_bool(flask.request.args.get('prefer_cache')) or _parse_bool(flask.request.args.get('offline_fallback'))
                allow_cache = cache_enabled and flask.request.args.get('cache_bust') != '1'

                cached_payload = None
                cache_is_stale = False
                if cache_enabled or stale_if_error > 0 or prefer_cache:
                    cached_payload, cache_is_stale = _cache_get(
                        model_key,
                        cache_key,
                        model_class,
                        allow_stale=(prefer_cache or stale_if_error > 0),
                        allow_stale_seconds=stale_if_error
                    )

                if allow_cache and cached_payload and (prefer_cache or not cache_is_stale):
                    cached_meta = cached_payload.get('meta', {}).get('pagination', {})
                    cached_total = cached_meta.get('total_items', 0)
                    max_updated_cached = None
                    try:
                        if cached_payload.get('data'):
                            upd_vals = [item.get('updated_at') for item in cached_payload['data'] if item.get('updated_at')]
                            if upd_vals:
                                max_updated_cached = max(upd_vals)
                    except Exception:
                        pass

                    etag = _scoped_etag(model_class, cached_total, max_updated_cached)
                    cache_headers = _generate_cache_headers(model_class, max_updated_cached)
                    cache_headers['X-Cache-Status'] = 'STALE' if cache_is_stale else 'HIT'
                    if cache_is_stale:
                        cache_headers['Warning'] = '110 - "Contenido en caché expirado usado por prefer_cache/offline"'

                    if _check_conditional_request(etag, cache_headers.get('Last-Modified')):
                        resp = flask_make_response('', 304)
                        resp.headers['ETag'] = etag
                        for k, v in cache_headers.items():
                            resp.headers[k] = v
                        return resp

                    resp = flask_make_response(jsonify(cached_payload), 200)
                    resp.headers['ETag'] = etag
                    for k, v in cache_headers.items():
                        resp.headers[k] = v
                    return resp

                page = flask.request.args.get('page', type=int)
                # Accept new 'limit' param or legacy 'per_page' for compatibility
                per_page = flask.request.args.get('limit', type=int) or flask.request.args.get('per_page', type=int)
                if page is not None and page < 1:
                    return {
                        'success': False,
                        'error': 'Invalid pagination',
                        'message': 'page debe ser >= 1'
                    }, 400
                if per_page is not None and per_page < 1:
                    return {
                        'success': False,
                        'error': 'Invalid pagination',
                        'message': 'limit debe ser >= 1'
                    }, 400

                # Interactive lists must never become accidental full-table
                # exports. Dedicated export endpoints can stream large data.
                max_page_size = int(flask.current_app.config.get('API_MAX_PAGE_SIZE', 500))
                if per_page is not None:
                    per_page = min(per_page, max_page_size)

                # Defaults seguros para evitar full scans
                if page is None:
                    page = 1
                if per_page is None:
                    per_page = 50

                search = flask.request.args.get('search', type=str)
                search_type = flask.request.args.get('search_type', default='auto', type=str)
                # Aceptar alias desde frontend: sort -> sort_by, order -> sort_order
                sort_by = flask.request.args.get('sort_by', type=str) or flask.request.args.get('sort', type=str)
                sort_order = flask.request.args.get('sort_order', type=str) or flask.request.args.get('order', type=str)
                # Default más seguro para UX: descendente cuando no se especifica
                if not sort_order:
                    sort_order = 'desc'
                include_rel = _parse_bool(flask.request.args.get('include_relations'))
                # Si la búsqueda es por fechas y no se especifica include_relations,
                # activarlo por defecto para asegurar serialización completa en listados.
                try:
                    if not flask.request.args.get('include_relations') and search_type in ('dates', 'all'):
                        include_rel = True
                except Exception:
                    pass

                filters = {}

                # Mapeo de campos del frontend al backend para compatibilidad
                frontend_to_backend_map = {
                    'father_id': 'idFather',
                    'mother_id': 'idMother',
                    # Nota: animal_id es el campo correcto en las tablas hijas, no animals_id
                    # Este mapeo se eliminó para evitar conflictos con el cacheo
                }

                # Primero mapear campos del frontend
                mapped_args = {}
                for frontend_field, backend_field in frontend_to_backend_map.items():
                    if frontend_field in flask.request.args:
                        mapped_args[backend_field] = flask.request.args[frontend_field]

                # Combinar con los argumentos originales (prioridad a los mapeados)
                combined_args = dict(flask.request.args)
                combined_args.update(mapped_args)

                filterable_fields = list(getattr(model_class, '_filterable_fields', []))
                range_filter_fields = getattr(model_class, '_range_filter_fields', {})
                filterable_fields.extend(range_filter_fields.keys())
                for field in filterable_fields:
                    if field in combined_args:
                        raw = combined_args.get(field)

                        # Convertir tipo según la columna del modelo
                        try:
                            source_field = range_filter_fields.get(field, field)
                            column = getattr(model_class, source_field, None)
                            if column is not None and hasattr(column, 'type'):
                                column_type = column.type
                                from sqlalchemy import Enum as SQLEnum, Date, DateTime
                                import datetime as dt

                                def convert_single_value(v):
                                    """Convierte un valor según el tipo de columna"""
                                    # Enums
                                    if isinstance(column_type, SQLEnum) and field in getattr(model_class, '_enum_fields', {}):
                                        enum_class = model_class._enum_fields[field]
                                        try:
                                            return enum_class(v)
                                        except (ValueError, KeyError):
                                            try:
                                                return enum_class[str(v).upper()]
                                            except KeyError:
                                                logger.warning(f"Valor enum inválido para {field}: {v}")
                                                return v

                                    # Dates y DateTimes
                                    elif isinstance(column_type, (Date, DateTime)):
                                        try:
                                            if isinstance(column_type, DateTime):
                                                return dt.datetime.fromisoformat(v)
                                            else:
                                                return dt.date.fromisoformat(v)
                                        except (ValueError, TypeError):
                                            logger.warning(f"Fecha inválida para {field}: {v}")
                                            return v

                                    # Tipos primitivos
                                    elif hasattr(column_type, 'python_type'):
                                        py_type = column_type.python_type
                                        if py_type is int:
                                            return int(v)
                                        elif py_type is float:
                                            return float(v)
                                        elif py_type is bool:
                                            return v.lower() in ('true', '1', 'yes')
                                        else:
                                            return v
                                    else:
                                        return v

                                # Manejar listas de valores (múltiples filtros)
                                if raw and ',' in raw:
                                    values = [v.strip() for v in raw.split(',') if v.strip()]
                                    converted_values = []
                                    for v in values:
                                        try:
                                            converted_values.append(convert_single_value(v))
                                        except (ValueError, TypeError):
                                            converted_values.append(v)
                                    filters[field] = converted_values
                                else:
                                    # Valor único
                                    filters[field] = convert_single_value(raw)

                        except (ValueError, TypeError, AttributeError) as e:
                            # Si falla la conversión, usar el valor raw como fallback
                            logger.warning(f"No se pudo convertir filtro {field}={raw}: {e}")
                            if raw and ',' in raw:
                                filters[field] = [v.strip() for v in raw.split(',') if v.strip()]
                            else:
                                filters[field] = raw

                # Log de filtros aplicados (debug)
                if filters:
                    logger.debug(f"Filtros aplicados en {model_class.__name__}: {filters}")

                # Soporte para sincronización delta: ?since=timestamp
                # Retorna solo registros modificados/creados después de la fecha especificada
                since_param = flask.request.args.get('since', type=str)
                if since_param:
                    try:
                        # Parsear timestamp ISO 8601 (ej: 2025-09-06T12:00:00Z)
                        from datetime import datetime as _dt
                        since_date = _dt.fromisoformat(since_param.replace('Z', '+00:00'))

                        # Agregar filtro automático en updated_at >= since_date
                        if not filters:
                            filters = {}

                        # Crear condición para obtener cambios recientes
                        filters['_since'] = since_date  # Usar '_since' especial para diferenciarlo
                        logger.debug(f"Delta sync enabled: since={since_date}")
                    except (ValueError, TypeError) as e:
                        logger.warning(f"Parámetro 'since' inválido: {since_param} - {e}")

                query_or_paginated = model_class.get_namespace_query(
                    filters=filters or None,
                    search=search,
                    search_type=search_type,
                    sort_by=sort_by,
                    sort_order=sort_order,
                    page=page,
                    per_page=per_page,
                    include_relations=include_rel
                )

                data_struct = model_class.get_paginated_response(
                    query_or_paginated, include_relations=include_rel
                )

                # Prefer unified pagination keys but fallback to legacy ones for compatibility
                items = data_struct.get('items', [])
                page_val = data_struct.get('page', 1)
                per_page_val = data_struct.get('limit', data_struct.get('per_page', len(items)))
                total_val = data_struct.get('total_items', data_struct.get('total', len(items)))
                max_updated = None
                try:
                    if items:
                        upd_vals = [it.get('updated_at') for it in items if isinstance(it, dict) and it.get('updated_at')]
                        if upd_vals:
                            max_updated = max(upd_vals)
                except Exception:
                    pass
                # Filtrado de campos (?fields=)
                # En búsquedas por fechas, devolver objetos completos y evitar recortes de columnas.
                fields_param = flask.request.args.get('fields')
                try:
                    raw_search = flask.request.args.get('search', type=str) or ''
                    st = (flask.request.args.get('search_type', default='auto', type=str) or 'auto').lower()
                    # Heurística para detectar término de fecha (año, año-mes, fecha completa)
                    def _looks_like_date(s: str) -> bool:
                        s = (s or '').strip()
                        if not s:
                            return False
                        if s.isdigit() and len(s) == 4:
                            return True
                        if ('-' in s or '/' in s):
                            parts = s.replace('/', '-').split('-')
                            if len(parts) in (2, 3):
                                return all(p.isdigit() for p in parts)
                        return False

                    is_date_like = _looks_like_date(raw_search)
                    # Si es búsqueda por fechas efectiva (dates/all o auto con término de fecha), ignorar 'fields'
                    if fields_param and (st in ('dates', 'all') or (st == 'auto' and is_date_like)):
                        fields_param = None
                except Exception:
                    # Ante cualquier error, mantener comportamiento previo
                    pass

                if fields_param:
                    selected = [f.strip() for f in fields_param.split(',') if f.strip()]
                    # Agregar campos de filtro a selected para asegurar que estén en la respuesta
                    filter_fields = set(filters.keys()) if filters else set()
                    selected_set = set(selected) | filter_fields
                    if selected_set:
                        items = [
                            {k: v for k, v in obj.items() if k in selected_set}
                            for obj in items
                        ]

                # Export CSV si ?export=csv
                export_fmt = flask.request.args.get('export')
                if export_fmt and export_fmt.lower() == 'csv':
                    output = io.StringIO()
                    # Determinar encabezados (union de keys) preservando orden de primera fila
                    headers = []
                    for it in items:
                        for k in it.keys():
                            if k not in headers:
                                headers.append(k)
                    writer = csv.DictWriter(output, fieldnames=headers)
                    writer.writeheader()
                    for row in items:
                        writer.writerow(row)
                    csv_data = output.getvalue()
                    resp = flask_make_response(csv_data, 200)
                    resp.headers['Content-Type'] = 'text/csv; charset=utf-8'
                    resp.headers['Content-Disposition'] = f'attachment; filename={model_class.__name__.lower()}_export.csv'
                    if max_updated:
                        resp.headers['ETag'] = f"W/{_scoped_etag(model_class, data_struct['total'], max_updated)}"
                    return resp

                from app.utils.response_handler import APIResponse, ResponseFormatter
                sanitized_items = ResponseFormatter.sanitize_for_frontend(items)
                response_payload, _ = APIResponse.paginated_success(
                    data=sanitized_items,
                    page=page_val,
                    limit=per_page_val,
                    total_items=total_val,
                    message=f'Lista de {name} obtenida exitosamente'
                )

                # Debug: log the response payload to help trace test failures where
                # an item appears in the list but detail GET returns 404.
                logger.debug(f"List response payload for {model_class.__name__}: {response_payload}")

                # Generar ETag estable basado en datos reales (total y último updated_at)
                etag = _scoped_etag(model_class, total_val, max_updated)
                pwa_headers = _generate_cache_headers(model_class, max_updated)

                # Verificar si el cliente ya tiene esta versión (solo si se permite usar cache)
                if allow_cache and _check_conditional_request(etag, pwa_headers.get('Last-Modified')):
                    # Cliente tiene versión válida, retornar 304 Not Modified
                    resp = flask_make_response('', 304)
                    resp.headers['ETag'] = etag
                    for k, v in pwa_headers.items():
                        resp.headers[k] = v
                    return resp

                # Guardar en caché DESPUÉS de verificar 304
                if cache_enabled:
                    _cache_set(model_key, cache_key, response_payload, model_class)

                # Retornar respuesta completa con headers PWA
                resp = flask_make_response(jsonify(response_payload), 200)
                resp.headers['ETag'] = etag
                for k, v in pwa_headers.items():
                    resp.headers[k] = v

                # Header X-Has-More para paginación infinita en PWA
                pagination_meta = response_payload.get('meta', {}).get('pagination', {})
                if pagination_meta.get('has_next_page', False):
                    resp.headers['X-Has-More'] = 'true'
                else:
                    resp.headers['X-Has-More'] = 'false'

                # Header X-Total-Count para ayudar a PWA a dimensionar carga
                resp.headers['X-Total-Count'] = str(total_val)

                return resp

            except Exception as e:
                logger.error(f"Error listando {model_class.__name__}: {e}", exc_info=True)
                from app.utils.response_handler import APIResponse

                # Intentar fallback a caché stale si existe y está permitido
                if cached_payload and stale_if_error > 0:
                    try:
                        cached_meta = cached_payload.get('meta', {}).get('pagination', {})
                        cached_total = cached_meta.get('total_items', 0)
                        max_updated_cached = None
                        try:
                            if cached_payload.get('data'):
                                upd_vals = [item.get('updated_at') for item in cached_payload['data'] if item.get('updated_at')]
                                if upd_vals:
                                    max_updated_cached = max(upd_vals)
                        except Exception:
                            pass

                        etag = _scoped_etag(model_class, cached_total, max_updated_cached)
                        cache_headers = _generate_cache_headers(model_class, max_updated_cached)
                        cache_headers['X-Cache-Status'] = 'STALE-FALLBACK'
                        cache_headers['Warning'] = '111 - "Respuesta en caché servida por error de backend"'
                        cache_headers['X-Offline-Fallback'] = 'true'
                        resp = flask_make_response(jsonify(cached_payload), 200)
                        resp.headers['ETag'] = etag
                        for k, v in cache_headers.items():
                            resp.headers[k] = v
                        return resp
                    except Exception:
                        logger.debug("No se pudo usar fallback de caché tras error de backend", exc_info=True)

                resp_body, status = APIResponse.error('Error interno del servidor', details={'error': str(e), 'context': f'list {model_class.__name__}'}, status_code=500)
                resp = flask_make_response(jsonify(resp_body), status)
                return resp

        @_maybe_rate_limit
        @ns.doc('head_list_' + name, description='HEAD listado: devuelve solo headers (ETag, status) sin cuerpo')
        def head(self):  # HEAD same metadata without body
            resp = self.get()
            # resp may be (body, status) or (body, status, headers)
            if isinstance(resp, tuple):
                if len(resp) == 3:
                    return '', resp[1], resp[2]
                elif len(resp) == 2:
                    return '', resp[1]
            return '', 200

        create_doc_kwargs = {
            'id': 'create_' + name,
            'description': 'Crear nuevo registro',
        }
        if is_public_create:
            create_doc_kwargs['security'] = [] # type: ignore
            from typing import Any
            responses_dict: Any = {
                '201': 'Recurso creado',
                '400': 'Datos inválidos',
                '409': 'Conflicto de unicidad',
                '500': 'Error interno del servidor',
            }
            create_doc_kwargs['responses'] = responses_dict
        @ns.doc(**create_doc_kwargs)
        @ns.expect(input_model, validate=False)  # Validación manual para mejor control
        @require_permission(entity, 'create')
        @_maybe_rate_limit
        def post(self):  # Create
            try:
                payload = flask.request.get_json(force=True, silent=True)
                if not payload or not isinstance(payload, dict):
                    return _validation_error_response({'payload': 'Se requiere un objeto JSON válido y no vacío.'})

                logger.info(f"Creating {model_class.__name__} with payload: {payload}")
                # Convert ISO date/datetime strings into Python objects for DB drivers
                try:
                    from sqlalchemy import Date, DateTime
                    import datetime as _dt
                    for col in model_class.__table__.columns:
                        cname = col.name
                        if cname in payload and isinstance(payload[cname], str):
                            try:
                                if isinstance(col.type, Date):
                                    payload[cname] = _dt.date.fromisoformat(payload[cname])
                                elif isinstance(col.type, DateTime):
                                    # datetime.fromisoformat handles both naive and offset-aware
                                    payload[cname] = _dt.datetime.fromisoformat(payload[cname])
                            except Exception:
                                # Leave as-is; let model validation handle the error
                                pass
                except Exception:
                    # If sqlalchemy types not available or conversion fails, continue
                    pass

                # Remap input aliases if model provides them (legacy keys)
                try:
                    aliases = getattr(model_class, '_input_aliases', {}) or {}
                    for k, v in list(payload.items()):
                        if k in aliases and aliases[k] not in payload:
                            payload[aliases[k]] = payload.pop(k)
                except Exception:
                    pass

                # Crear registro (commit incluido en model_class.create())
                logger.debug(f"Creating {model_class.__name__} instance...")
                logger.info(f"POST payload keys for {model_class.__name__}: {list(payload.keys())}")
                instance = model_class.create(**payload)
                logger.debug(f"Instance created with ID: {instance.id}")

                # Serializar INMEDIATAMENTE después de create (antes de cualquier operación que pueda detach)
                try:
                    logger.debug(f"Serializing {model_class.__name__} instance...")
                    result = instance.to_namespace_dict()
                    instance_id = instance.id
                    logger.info(f"{model_class.__name__} created successfully with ID: {instance_id}")
                except Exception as e:
                    logger.error(f"Error serializing {model_class.__name__} after create: {e}", exc_info=True)
                    # Fallback: re-query desde BD
                    logger.debug(f"Re-querying {model_class.__name__} ID {instance.id} from DB...")
                    instance = model_class.query.get(instance.id)
                    if instance:
                        result = instance.to_namespace_dict()
                        instance_id = instance.id
                        logger.info(f"{model_class.__name__} re-queried and serialized successfully with ID: {instance_id}")
                    else:
                        raise Exception(f"Failed to serialize and re-query {model_class.__name__}")

                # Invalidar cache DESPUÉS de serialización exitosa
                _cache_clear(model_class.__name__)
                _detail_cache_clear(model_class.__name__, instance_id)
                logger.debug(f"Cache cleared for {model_class.__name__}")

                try:
                    relations = build_relations_from_instance(instance)
                    log_activity_event(
                        action='create',
                        entity=model_class.__name__.lower(),
                        entity_id=instance_id,
                        title=f'{model_class.__name__} creado',
                        description='Creacion desde API',
                        relations=relations,
                        animal_id=relations.get('animal_id') if relations else None,
                    )
                except Exception:
                    logger.debug("No se pudo registrar activity_log en create", exc_info=True)
                try:
                    from flask import current_app
                    bus = current_app.extensions.get("event_bus")
                    if bus:
                        bus.publish(name, "create", instance_id)
                except Exception:
                    pass

                # Notificar a administradores cuando se crea un nuevo usuario
                try:
                    if model_class.__name__ == 'User':
                        from app.services.push_notification_service import PushNotificationService
                        from app.services.event_service import EventService
                        from app.models.user import Role
                        from app.models.user_finca import UserFinca

                        user = instance
                        finca_id = getattr(user, 'finca_id', None)
                        role_val = getattr(user, 'role', None)
                        role_display = role_val.value if hasattr(role_val, 'value') else str(role_val) if role_val else 'Usuario'
                        user_name = getattr(user, 'fullname', 'Un usuario') or 'Un usuario'

                        if finca_id:
                            PushNotificationService.send_to_finca(
                                finca_id=finca_id,
                                title='Nuevo Usuario Registrado',
                                body=f'{user_name} se ha registrado como {role_display}.',
                                roles=[Role.Administrador.value, Role.Propietario.value],
                                tag='new-user',
                                data={'type': 'new_user', 'user_id': instance_id, 'url': '/admin/users'}
                            )

                            admin_memberships = UserFinca.query.filter_by(
                                finca_id=finca_id, role='Administrador'
                            ).all()
                            for m in admin_memberships:
                                EventService.emit_to_user(
                                    user_id=m.user_id,
                                    event_type="new_user",
                                    data={
                                        "title": "Nuevo Usuario Registrado",
                                        "message": f'{user_name} se ha registrado como {role_display}.',
                                        "type": "info",
                                        "action": {
                                            "label": "Ver Usuarios",
                                            "url": "/admin/users"
                                        }
                                    }
                                )
                except Exception as e:
                    logger.warning(f"No se pudo enviar notificación de nuevo usuario: {e}")

                # Construir respuesta con datos serializados
                from flask import make_response
                response = APIResponse.created(result, message=f'{model_class.__name__} creado exitosamente')
                if isinstance(response, tuple) and len(response) >= 2:
                    resp_body, status_code = response[0], response[1]
                    resp = make_response(jsonify(resp_body), status_code)
                    # Headers para invalidar caché del cliente
                    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                    resp.headers['Pragma'] = 'no-cache'
                    resp.headers['Expires'] = '0'
                    resp.headers['ETag'] = f'"{instance_id}"'
                    logger.debug(f"Response prepared for {model_class.__name__} ID {instance_id}")
                    return resp
                logger.debug(f"Returning simple response for {model_class.__name__}")
                return response

            except ValidationError as ve:
                db.session.rollback()
                logger.warning(f"Validation error creating {model_class.__name__}: {ve.message}")
                errors = _format_validation_errors(ve)
                conflict_detected = False
                try:
                    conflict_detected = getattr(ve, 'code', '').lower() in ('conflict', 'unique')
                    if not conflict_detected:
                        error_list = []
                        if isinstance(errors, dict):
                            error_list = errors.values()
                        elif isinstance(errors, list):
                            error_list = errors
                        else:
                            error_list = [errors]
                        conflict_detected = any(isinstance(err, str) and 'ya existe' in err.lower() for err in error_list)
                except Exception:
                    conflict_detected = False

                if conflict_detected:
                    return APIResponse.conflict('Violación de unicidad', details={'validation_errors': errors})

                return _validation_error_response(errors)
            except IntegrityError as ie:
                return _handle_integrity_error(ie, 'create')
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error creando {model_class.__name__}: {e}", exc_info=True)
                return APIResponse.error('Error interno del servidor', details={'error': str(e), 'context': f'create {model_class.__name__}'}, status_code=500)

    class ModelDetailResource(Resource):
        @ns.doc('get_' + name, description='Obtener detalle por ID (soporta include_relations)')
        @require_permission(entity, 'read')
        @_maybe_rate_limit
        def get(self, record_id: int):  # Retrieve
            try:
                cache_config = getattr(model_class, '_cache_config', {})
                stale_if_error = cache_config.get('stale_if_error', 0)
                prefer_cache = _parse_bool(flask.request.args.get('prefer_cache')) or _parse_bool(flask.request.args.get('offline_fallback'))
                allow_cache = cache_enabled and flask.request.args.get('cache_bust') != '1'

                cached_payload = None
                cache_is_stale = False
                if cache_enabled or stale_if_error > 0 or prefer_cache:
                    cached_payload, cache_is_stale = _detail_cache_get(
                        model_class.__name__,
                        record_id,
                        model_class,
                        allow_stale=(prefer_cache or stale_if_error > 0),
                        allow_stale_seconds=stale_if_error
                    )

                if allow_cache and cached_payload and (prefer_cache or not cache_is_stale):
                    max_updated_cached = None
                    try:
                        data_obj = cached_payload.get('data', {})
                        max_updated_cached = data_obj.get('updated_at')
                    except Exception:
                        pass
                    etag = _scoped_etag(model_class, record_id, max_updated_cached)
                    cache_headers = _generate_cache_headers(model_class, max_updated_cached)
                    cache_headers['X-Cache-Status'] = 'STALE' if cache_is_stale else 'HIT'
                    if cache_is_stale:
                        cache_headers['Warning'] = '110 - "Detalle en caché expirado usado por prefer_cache/offline"'
                    if _check_conditional_request(etag, cache_headers.get('Last-Modified')):
                        resp = flask_make_response('', 304)
                        resp.headers['ETag'] = etag
                        for k, v in cache_headers.items():
                            resp.headers[k] = v
                        return resp
                    resp = flask_make_response(jsonify(cached_payload), 200)
                    resp.headers['ETag'] = etag
                    for k, v in cache_headers.items():
                        resp.headers[k] = v
                    return resp

                include_relations = flask.request.args.get('include_relations', 'false').lower() == 'true'
                instance = model_class.get_by_id(record_id, include_relations=include_relations)
                if not instance:
                    body, status = APIResponse.not_found(name.capitalize())
                    return flask_make_response(jsonify(body), status)

                fields_param = flask.request.args.get('fields')
                data_obj = instance.to_namespace_dict(include_relations=include_relations)
                if fields_param:
                    selected = [f.strip() for f in fields_param.split(',') if f.strip()]
                    data_obj = {k: v for k, v in data_obj.items() if k in selected}
                body, status = APIResponse.success(data=data_obj, message=f'{name.capitalize()} obtenido exitosamente')
                resp = flask_make_response(jsonify(body), status)

                try:
                    etag = _scoped_etag(model_class, record_id, data_obj.get("updated_at") if isinstance(data_obj, dict) else None)
                    pwa_headers = _generate_cache_headers(model_class, data_obj.get('updated_at') if isinstance(data_obj, dict) else None)
                    pwa_headers['X-Cache-Status'] = 'MISS'
                    resp.headers['ETag'] = etag
                    for k, v in pwa_headers.items():
                        resp.headers[k] = v
                    if cache_enabled:
                        _detail_cache_set(model_class.__name__, record_id, body, model_class)
                except Exception:
                    logger.debug("No se pudo cachear/etiquetar respuesta de detalle", exc_info=True)

                return resp
            except Exception as e:
                logger.error(f"Error obteniendo {model_class.__name__} ID {record_id}: {e}", exc_info=True)
                if cached_payload and stale_if_error > 0:
                    try:
                        max_updated_cached = None
                        try:
                            data_obj = cached_payload.get('data', {})
                            max_updated_cached = data_obj.get('updated_at')
                        except Exception:
                            pass
                        etag = _scoped_etag(model_class, record_id, max_updated_cached)
                        cache_headers = _generate_cache_headers(model_class, max_updated_cached)
                        cache_headers['X-Cache-Status'] = 'STALE-FALLBACK'
                        cache_headers['Warning'] = '111 - "Detalle en caché servido por error de backend"'
                        cache_headers['X-Offline-Fallback'] = 'true'
                        resp = flask_make_response(jsonify(cached_payload), 200)
                        resp.headers['ETag'] = etag
                        for k, v in cache_headers.items():
                            resp.headers[k] = v
                        return resp
                    except Exception:
                        logger.debug("No se pudo usar fallback de caché para detalle tras error", exc_info=True)
                body, status = APIResponse.error('Error interno del servidor', details={'error': str(e), 'context': f'get {model_class.__name__}'}, status_code=500)
                resp = flask_make_response(jsonify(body), status)
                return resp

        @ns.doc('update_' + name, description='Actualizar registro (reemplazo completo)')
        @ns.expect(input_model, validate=False)
        @require_permission(entity, 'update')
        @_maybe_rate_limit
        def put(self, record_id: int):  # Update
            try:
                instance = model_class.get_by_id(record_id)
                if not instance:
                    return APIResponse.not_found(name.capitalize())

                payload = flask.request.get_json(force=True, silent=True)
                if not payload or not isinstance(payload, dict):
                    return APIResponse.validation_error({'payload': 'Se requiere un objeto JSON válido y no vacío.'})

                # Normalizar payload para PUT/PATCH (paridad con POST): fechas ISO y aliases de entrada
                try:
                    from sqlalchemy import Date, DateTime
                    import datetime as _dt
                    for col in model_class.__table__.columns:
                        cname = col.name
                        if cname in payload and isinstance(payload[cname], str):
                            try:
                                if isinstance(col.type, Date):
                                    payload[cname] = _dt.date.fromisoformat(payload[cname])
                                elif isinstance(col.type, DateTime):
                                    txt = payload[cname]
                                    if txt.endswith('Z'):
                                        txt = txt[:-1] + '+00:00'
                                    payload[cname] = _dt.datetime.fromisoformat(txt)
                            except Exception:
                                pass
                except Exception:
                    pass

                try:
                    aliases = getattr(model_class, '_input_aliases', {}) or {}
                    for k in list(payload.keys()):
                        if k in aliases and aliases[k] not in payload:
                            payload[aliases[k]] = payload.pop(k)
                except Exception:
                    pass

                # Actualizar (commit incluido en instance.update())
                logger.debug(f"Updating {model_class.__name__} ID {record_id}...")
                instance.update(**payload)

                # Serializar INMEDIATAMENTE después de update
                try:
                    logger.debug(f"Serializing updated {model_class.__name__} ID {record_id}...")
                    result = instance.to_namespace_dict()
                    logger.info(f"{model_class.__name__} ID {record_id} updated successfully")
                except Exception as e:
                    logger.error(f"Error serializing {model_class.__name__} after update: {e}", exc_info=True)
                    # Fallback: re-query desde BD
                    instance = model_class.query.get(record_id)
                    if instance:
                        result = instance.to_namespace_dict()
                        logger.info(f"{model_class.__name__} ID {record_id} re-queried and serialized")
                    else:
                        raise Exception(f"Failed to serialize and re-query {model_class.__name__} ID {record_id}")

                # Invalidar cache DESPUÉS de serialización exitosa
                _cache_clear(model_class.__name__)

                try:
                    relations = build_relations_from_instance(instance)
                    updated_fields = ', '.join(sorted(payload.keys())) if isinstance(payload, dict) else ''
                    description = f"Campos actualizados: {updated_fields}" if updated_fields else 'Actualizacion desde API'
                    log_activity_event(
                        action='update',
                        entity=model_class.__name__.lower(),
                        entity_id=record_id,
                        title=f'{model_class.__name__} actualizado',
                        description=description,
                        relations=relations,
                        animal_id=relations.get('animal_id') if relations else None,
                    )
                except Exception:
                    logger.debug("No se pudo registrar activity_log en update", exc_info=True)
                try:
                    from flask import current_app
                    bus = current_app.extensions.get("event_bus")
                    if bus:
                        bus.publish(name, "update", record_id)
                except Exception:
                    pass

                # Construir respuesta
                from flask import make_response
                response = APIResponse.success(data=result, message=f'{name.capitalize()} actualizado exitosamente')
                if isinstance(response, tuple) and len(response) >= 2:
                    resp_body, status_code = response[0], response[1]
                    resp = make_response(jsonify(resp_body), status_code)
                    # Headers para invalidar caché del cliente
                    resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                    resp.headers['Pragma'] = 'no-cache'
                    resp.headers['Expires'] = '0'
                    resp.headers['ETag'] = f'"{instance.id}-{instance.updated_at}"' if hasattr(instance, 'updated_at') else f'"{instance.id}"'
                    return resp
                return response

            except ValidationError as ve:
                db.session.rollback()
                logger.warning(f"Validation error updating {model_class.__name__} id={record_id}: {ve.message}")
                return APIResponse.validation_error(_format_validation_errors(ve))
            except IntegrityError as ie:
                return _handle_integrity_error(ie, 'update', record_id)
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error actualizando {model_class.__name__} id={record_id}: {e}", exc_info=True)
                return APIResponse.error('Error interno del servidor', details={'error': str(e), 'context': f'update {model_class.__name__}'}, status_code=500)

        if enable_patch:
            @ns.doc('patch_' + name, description='Actualizar parcialmente registro')
            @ns.expect(input_model, validate=False)
            @require_permission(entity, 'update')
            @_maybe_rate_limit
            def patch(self, record_id: int):  # Partial update
                try:
                    instance = model_class.get_by_id(record_id)
                    if not instance:
                        return APIResponse.not_found(name.capitalize())

                    payload = flask.request.get_json(force=True, silent=True) or {}
                    if not isinstance(payload, dict):
                        return APIResponse.validation_error({'payload': 'Se requiere un objeto JSON.'})

                    # Normalizar payload para PUT/PATCH (paridad con POST): fechas ISO y aliases de entrada
                    try:
                        from sqlalchemy import Date, DateTime
                        import datetime as _dt
                        for col in model_class.__table__.columns:
                            cname = col.name
                            if cname in payload and isinstance(payload[cname], str):
                                try:
                                    if isinstance(col.type, Date):
                                        payload[cname] = _dt.date.fromisoformat(payload[cname])
                                    elif isinstance(col.type, DateTime):
                                        txt = payload[cname]
                                        if txt.endswith('Z'):
                                            txt = txt[:-1] + '+00:00'
                                        payload[cname] = _dt.datetime.fromisoformat(txt)
                                except Exception:
                                    pass
                    except Exception:
                        pass

                    try:
                        aliases = getattr(model_class, '_input_aliases', {}) or {}
                        for k in list(payload.keys()):
                            if k in aliases and aliases[k] not in payload:
                                payload[aliases[k]] = payload.pop(k)
                    except Exception:
                        pass

                    # Actualizar parcialmente (commit incluido en instance.update())
                    logger.debug(f"Patching {model_class.__name__} ID {record_id}...")
                    instance.update(**payload)

                    # Serializar INMEDIATAMENTE después de patch
                    try:
                        logger.debug(f"Serializing patched {model_class.__name__} ID {record_id}...")
                        result = instance.to_namespace_dict()
                        logger.info(f"{model_class.__name__} ID {record_id} patched successfully")
                    except Exception as e:
                        logger.error(f"Error serializing {model_class.__name__} after patch: {e}", exc_info=True)
                        # Fallback: re-query desde BD
                        instance = model_class.query.get(record_id)
                        if instance:
                            result = instance.to_namespace_dict()
                            logger.info(f"{model_class.__name__} ID {record_id} re-queried and serialized")
                        else:
                            raise Exception(f"Failed to serialize and re-query {model_class.__name__} ID {record_id}")

                    # Invalidar cache DESPUÉS de serialización exitosa
                    _cache_clear(model_class.__name__)
                    _detail_cache_clear(model_class.__name__, record_id)

                    try:
                        relations = build_relations_from_instance(instance)
                        updated_fields = ', '.join(sorted(payload.keys())) if isinstance(payload, dict) else ''
                        description = f"Campos actualizados: {updated_fields}" if updated_fields else 'Actualizacion parcial desde API'
                        log_activity_event(
                            action='update',
                            entity=model_class.__name__.lower(),
                            entity_id=record_id,
                            title=f'{model_class.__name__} actualizado',
                            description=description,
                            relations=relations,
                            animal_id=relations.get('animal_id') if relations else None,
                        )
                    except Exception:
                        logger.debug("No se pudo registrar activity_log en patch", exc_info=True)
                    try:
                        from flask import current_app
                        bus = current_app.extensions.get("event_bus")
                        if bus:
                            bus.publish(name, "update", record_id)
                    except Exception:
                        pass

                    # Construir respuesta
                    from flask import make_response
                    response = APIResponse.success(data=result, message=f'{name.capitalize()} actualizado parcialmente')
                    if isinstance(response, tuple) and len(response) >= 2:
                        resp_body, status_code = response[0], response[1]
                        resp = make_response(jsonify(resp_body), status_code)
                        # Headers para invalidar caché del cliente
                        resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                        resp.headers['Pragma'] = 'no-cache'
                        resp.headers['Expires'] = '0'
                        resp.headers['ETag'] = f'"{instance.id}-{instance.updated_at}"' if hasattr(instance, 'updated_at') else f'"{instance.id}"'
                        return resp
                    return response

                except ValidationError as ve:
                    db.session.rollback()
                    logger.warning(f"Validation error patching {model_class.__name__} id={record_id}: {ve.message}")
                    return APIResponse.validation_error(_format_validation_errors(ve))
                except IntegrityError as ie:
                    return _handle_integrity_error(ie, 'patch', record_id)
                except Exception as e:
                    db.session.rollback()
                    logger.error(f"Error patch {model_class.__name__} id={record_id}: {e}", exc_info=True)
                    return APIResponse.error('Error interno del servidor', details={'error': str(e), 'context': f'patch {model_class.__name__}'}, status_code=500)

        @ns.doc('delete_' + name, description='Eliminar registro')
        @require_permission(entity, 'delete')
        @_maybe_rate_limit
        def delete(self, record_id: int):  # Delete
            try:
                instance = model_class.get_by_id(record_id)
                if not instance:
                    body, status = APIResponse.not_found(name.capitalize())
                    return flask_make_response(jsonify(body), status)

                # Verificación de integridad referencial optimizada
                from app.utils.integrity_checker import OptimizedIntegrityChecker

                can_delete, warnings = OptimizedIntegrityChecker.can_delete_safely(model_class, record_id)

                if not can_delete:
                    # No se puede eliminar - hay dependencias que lo bloquean
                    warning_messages = [w.warning_message for w in warnings if not w.cascade_delete]
                    body, status = APIResponse.error(
                        'No se puede eliminar el registro por dependencias existentes',
                        details={
                            'warnings': [w.to_dict() for w in warnings],
                            'blocking_dependencies': len(warning_messages),
                            'messages': warning_messages
                        },
                        status_code=409  # Conflict
                    )
                    return flask_make_response(jsonify(body), status)

                # Si hay dependencias con cascade, informar antes de eliminar
                cascade_warnings = [w for w in warnings if w.cascade_delete and w.dependent_count > 0]
                if cascade_warnings:
                    logger.info(f"Eliminando {model_class.__name__} id={record_id} con {len(cascade_warnings)} dependencias en cascade")

                # Eliminar de BD (commit incluido en instance.delete())
                try:
                    build_relations_from_instance(instance)
                except Exception:
                    logger.debug("No se pudo preparar relations para delete", exc_info=True)

                instance.delete()

                # Invalidar cache INMEDIATAMENTE después de commit exitoso
                _cache_clear(model_class.__name__)

                # Respuesta con información de eliminación cascade si aplica
                response_data: dict[str, Any] = {'deleted_id': record_id}
                if cascade_warnings:
                    response_data['cascade_deletions'] = {
                        'total_records': sum(w.dependent_count for w in cascade_warnings),
                        'details': [w.to_dict() for w in cascade_warnings]
                    }

                body, status = APIResponse.success(
                    data=response_data,
                    message=f'{name.capitalize()} eliminado exitosamente' +
                           (f" con {sum(w.dependent_count for w in cascade_warnings)} registro(s) relacionados" if cascade_warnings else "")
                )
                resp = flask_make_response(jsonify(body), status)
                # Headers para invalidar caché del cliente
                resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
                resp.headers['Pragma'] = 'no-cache'
                resp.headers['Expires'] = '0'
                # Usar timestamp actual para ETag de eliminación
                from datetime import datetime
                now = datetime.now(UTC).isoformat()
                resp.headers['ETag'] = f'"deleted-{record_id}-{now}"'
                try:
                    from flask import current_app
                    bus = current_app.extensions.get("event_bus")
                    if bus:
                        bus.publish(name, "delete", record_id)
                except Exception:
                    pass
                return resp
            except Exception as e:
                # Rollback explícito en caso de error
                db.session.rollback()
                logger.error(f"Error eliminando {model_class.__name__} id={record_id}: {e}", exc_info=True)
                body, status = APIResponse.error('Error interno del servidor', details={'error': str(e), 'context': f'delete {model_class.__name__}'}, status_code=500)
                return flask_make_response(jsonify(body), status)

        @_maybe_rate_limit
        @ns.doc('head_' + name, description='HEAD detalle: solo headers y estado')
        def head(self, record_id: int):  # HEAD detail
            resp = self.get(record_id)
            if isinstance(resp, tuple):
                if len(resp) >= 2:
                    if len(resp) == 3:
                        return '', resp[1], resp[2]
                    return '', resp[1]
            return '', 200

    # ---- Dependencies endpoint ----
    @ns.route('/<int:record_id>/dependencies')
    class ModelDependenciesResource(Resource):
        @ns.doc('get_dependencies_' + name, description='Verificar dependencias de un registro antes de eliminar')
        @_maybe_rate_limit
        def get(self, record_id: int):
            """Verificación de dependencias de un registro usando OptimizedIntegrityChecker."""
            try:
                # Verificar si el registro existe
                instance = model_class.get_by_id(record_id)
                if not instance:
                    body, status = APIResponse.not_found(name.capitalize())
                    return flask_make_response(jsonify(body), status)

                # Usar el integrity checker ultra-optimizado
                from app.utils.integrity_checker import OptimizedIntegrityChecker
                warnings = OptimizedIntegrityChecker.check_integrity_fast(model_class, record_id)

                # Mapeo de campos técnicos a descriptivos si el modelo lo provee
                field_mapping = getattr(model_class, '_field_mapping', {}) or {}

                dependencies = []
                total_count = 0

                for warning in warnings:
                    field_name = warning.dependent_field
                    # Aplicar mapeo de campos si existe
                    display_field = field_mapping.get(field_name, field_name)

                    table_name = warning.dependent_table
                    count = 0
                    samples = []

                    if warning.dependent_count > 0:
                        # 1. Obtener metadatos de la tabla
                        table = db.metadata.tables.get(table_name)
                        pk_col = 'id'
                        desc_col = None

                        if table is not None:
                            pk_cols = [c.name for c in table.primary_key.columns]
                            if pk_cols:
                                pk_col = pk_cols[0]

                            columns = [c.name for c in table.columns]
                            desc_candidates = ['name', 'nombre', 'record', 'code', 'codigo', 'title', 'titulo', 'tag', 'alias']
                            for cand in desc_candidates:
                                if cand in columns:
                                    desc_col = cand
                                    break
                            if not desc_col:
                                non_fk_cols = [c for c in columns if c != pk_col and not c.endswith('_id')]
                                if non_fk_cols:
                                    desc_col = non_fk_cols[0]
                                else:
                                    desc_col = pk_col
                        else:
                            desc_col = 'name'

                        # 2. Consultar el conteo real (con validación de identifiers)
                        _validate_sql_identifier(table_name)
                        _validate_sql_identifier(field_name)
                        try:
                            count_query = text(f"SELECT COUNT(*) FROM {table_name} WHERE {field_name} = :record_id")
                            count = db.session.execute(count_query, {'record_id': record_id}).scalar() or 0
                        except Exception as e:
                            logger.error(f"Error al consultar conteo real para tabla {table_name}: {e}")
                            count = warning.dependent_count

                        # 3. Consultar muestras (máximo 5)
                        try:
                            _validate_sql_identifier(pk_col)
                            _validate_sql_identifier(desc_col)
                            cols_to_select = f"{pk_col}"
                            if desc_col != pk_col:
                                cols_to_select += f", {desc_col}"

                            samples_query = text(f"SELECT {cols_to_select} FROM {table_name} WHERE {field_name} = :record_id LIMIT 5")
                            rows = db.session.execute(samples_query, {'record_id': record_id}).fetchall()

                            for row in rows:
                                try:
                                    s_id = row[pk_col]
                                    s_name = str(row[desc_col]) if desc_col != pk_col else f"ID: {s_id}"
                                except Exception:
                                    try:
                                        s_id = getattr(row, pk_col)
                                        s_name = str(getattr(row, desc_col)) if desc_col != pk_col else f"ID: {s_id}"
                                    except Exception:
                                        s_id = row[0]
                                        s_name = str(row[1]) if len(row) > 1 else f"ID: {s_id}"
                                samples.append({
                                    'id': s_id,
                                    'name': s_name
                                })
                        except Exception as e:
                            logger.error(f"Error al consultar muestras para tabla {table_name}: {e}")
                    else:
                        count = 0

                    # Regenerar mensaje descriptivo con el conteo real
                    real_message = OptimizedIntegrityChecker._generate_warning_message(warning.dependent_table, count, warning.cascade_delete)

                    dependencies.append({
                        'table': warning.dependent_table,
                        'count': count,
                        'field': display_field,
                        'cascade_delete': warning.cascade_delete,
                        'message': real_message,
                        'samples': samples
                    })
                    total_count += count

                can_delete = all(warning.cascade_delete for warning in warnings)

                # Construir mensaje apropiado
                if can_delete and total_count > 0:
                    message = f"Se eliminarán automáticamente {total_count} registro(s) relacionado(s)."
                elif can_delete:
                    message = f"Este {name} puede ser eliminado con seguridad."
                else:
                    message = f"No se puede eliminar este {name} porque tiene {total_count} registro(s) relacionado(s) que lo bloquean."

                body, status = APIResponse.success(
                    data={
                        'id': record_id,
                        'hasDependencies': total_count > 0,
                        'canDelete': can_delete,
                        'totalDependencies': total_count,
                        'message': message,
                        'dependencies': dependencies
                    },
                    message='Dependencias verificadas exitosamente'
                )
                return flask_make_response(jsonify(body), status)

            except Exception as e:
                logger.error(f"Error verificando dependencias de {model_class.__name__} ID {record_id}: {e}", exc_info=True)
                body, status = APIResponse.error(
                    message=f'Error al verificar dependencias: {str(e)}',
                    status_code=500
                )
                return flask_make_response(jsonify(body), status)

    # ---- Batch Dependencies endpoint ----
    @ns.route('/batch-dependencies')
    class ModelBatchDependenciesResource(Resource):
        @ns.doc('post_batch_dependencies_' + name, description='Verificación batch de dependencias para múltiples registros')
        @_maybe_rate_limit
        def post(self):
            """Verificación batch de dependencias. Espera JSON: { "ids": [1, 2, 3] }"""
            try:
                data = flask.request.get_json() or {}
                # Soportar 'ids' o el nombre específico 'animal_ids' etc para compatibilidad
                record_ids = data.get('ids') or data.get(f'{name}_ids') or data.get('record_ids')

                if not record_ids:
                    return APIResponse.error(message='Se requiere lista de ids', status_code=400)

                if not isinstance(record_ids, list):
                    return APIResponse.error(message='ids debe ser una lista', status_code=400)

                if len(record_ids) > 100:
                    return APIResponse.error(message='Máximo 100 registros por consulta', status_code=400)

                from app.utils.integrity_checker import OptimizedIntegrityChecker
                results: dict[int, dict[str, Any]] = {}

                # Verificar qué registros existen
                existing_records = model_class.query.filter(model_class.id.in_(record_ids)).all()
                existing_ids = {r.id for r in existing_records}

                for record_id in record_ids:
                    if record_id not in existing_ids:
                        results[record_id] = {
                            'exists': False,
                            'hasDependencies': False,
                            'canDelete': False,
                            'message': 'Registro no encontrado'
                        }
                    else:
                        warnings = OptimizedIntegrityChecker.check_integrity_fast(model_class, record_id)
                        total_count = sum(w.dependent_count for w in warnings)
                        can_delete = all(w.cascade_delete for w in warnings)

                        results[record_id] = {
                            'exists': True,
                            'hasDependencies': total_count > 0,
                            'canDelete': can_delete,
                            'totalDependencies': total_count,
                            'message': f"{'Puede eliminarse' if can_delete else 'No puede eliminarse'} ({total_count} dependencias)"
                        }

                return APIResponse.success(
                    data={
                        'results': results,
                        'processed': len(record_ids),
                        'found': len(existing_ids)
                    },
                    message='Verificación batch completada'
                )

            except Exception as e:
                logger.error(f"Error en verificación batch de {model_class.__name__}: {e}", exc_info=True)
                return APIResponse.error(
                    message=f'Error en verificación batch: {str(e)}',
                    status_code=500
                )

    ns.add_resource(ModelListResource, '/', '')
    ns.add_resource(ModelDetailResource, '/<int:record_id>')
    ns._model_list_resource = ModelListResource
    ns._model_detail_resource = ModelDetailResource

    # ---- Metadata endpoint para PWA (revalidación ligera) ----
    @ns.route('/metadata')
    class ModelMetadataResource(Resource):
        @ns.doc('metadata_' + name, description='Obtener metadatos del recurso (total, last_modified) sin body completo - optimizado para PWA')
        @_maybe_rate_limit
        def get(self):
            """Endpoint ligero para verificar si hay cambios sin descargar datos."""
            try:
                # Optimización: 1 sola query con COUNT(*) y MAX(updated_at)
                from sqlalchemy import func
                result = db.session.query(
                    func.count(model_class.id).label('total'),
                    func.max(model_class.updated_at).label('last_modified')
                ).first()

                total_count = result.total if result else 0
                max_updated = None
                if result and result.last_modified:
                    max_updated = result.last_modified.isoformat() if hasattr(result.last_modified, 'isoformat') else str(result.last_modified)

                allow_cache = flask.request.args.get('cache_bust') != '1'

                # Generar ETag estable basado en total y último updated_at
                etag = _scoped_etag(model_class, total_count, max_updated)
                pwa_headers = _generate_cache_headers(model_class, max_updated)
                # Forzar revalidación del cliente para metadata
                pwa_headers['Cache-Control'] = 'private, max-age=0, must-revalidate'

                # Verificar si el cliente ya tiene esta versión (solo si se permite usar cache)
                if allow_cache and _check_conditional_request(etag, pwa_headers.get('Last-Modified')):
                    # Cliente tiene versión válida, retornar 304 Not Modified
                    resp = flask_make_response('', 304)
                    resp.headers['ETag'] = etag
                    for k, v in pwa_headers.items():
                        resp.headers[k] = v
                    return resp

                # Retornar metadatos ligeros
                metadata = {
                    'success': True,
                    'data': {
                        'resource': name,
                        'total_count': total_count,
                        'last_modified': max_updated,
                        'etag': etag
                    }
                }

                resp = flask_make_response(jsonify(metadata), 200)
                resp.headers['ETag'] = etag
                for k, v in pwa_headers.items():
                    resp.headers[k] = v
                return resp

            except Exception as e:
                logger.error(f"Error obteniendo metadata de {model_class.__name__}: {e}", exc_info=True)
                body, status = APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)
                return flask_make_response(jsonify(body), status)

    # ---- Bulk ----
    if enable_bulk:
        @ns.route('/bulk')
        class ModelBulkResource(Resource):
            @ns.doc('bulk_create_' + name, description='Crear múltiples registros (soporta shared data)')
            @require_permission(entity, 'create')
            @_maybe_rate_limit
            def post(self):
                try:
                    payload = flask.request.get_json() or {}

                    # Soportar formato: { "shared": {...}, "items": [...] } o [{}, {}]
                    if isinstance(payload, dict) and 'items' in payload:
                        shared = payload.get('shared', {})
                        items = payload.get('items', [])
                        # Combinar shared data en cada item
                        final_items = []
                        for item in items:
                            new_item = shared.copy()
                            new_item.update(item)
                            final_items.append(new_item)
                        payload = final_items

                    if not isinstance(payload, list) or not payload:
                        return APIResponse.validation_error({'items': 'Se requiere lista de objetos no vacía'})

                    logger.debug(f"Bulk creating {len(payload)} {model_class.__name__} instances...")
                    instances = model_class.bulk_create(payload)
                    results = [inst.to_namespace_dict() for inst in instances]

                    _cache_clear(model_class.__name__)
                    return APIResponse.created(results, message=f'{len(results)} registros creados')
                except ValidationError as ve:
                    db.session.rollback()
                    return APIResponse.validation_error(_format_validation_errors(ve))
                except Exception as e:
                    db.session.rollback()
                    logger.error(f"Error bulk create {model_class.__name__}: {e}", exc_info=True)
                    return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)

            @ns.doc('bulk_update_' + name, description='Actualizar múltiples registros (requiere ID en cada item)')
            @require_permission(entity, 'update')
            @_maybe_rate_limit
            def put(self):
                try:
                    payload = flask.request.get_json() or []
                    if not isinstance(payload, list) or not payload:
                        return APIResponse.validation_error({'items': 'Se requiere lista de objetos con ID'})

                    logger.debug(f"Bulk updating {len(payload)} {model_class.__name__} instances...")
                    instances = model_class.bulk_update(payload)
                    results = [inst.to_namespace_dict() for inst in instances]

                    _cache_clear(model_class.__name__)
                    return APIResponse.success(results, message=f'{len(results)} registros actualizados')
                except ValidationError as ve:
                    db.session.rollback()
                    return APIResponse.validation_error(_format_validation_errors(ve))
                except Exception as e:
                    db.session.rollback()
                    logger.error(f"Error bulk update {model_class.__name__}: {e}", exc_info=True)
                    return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)

            @ns.doc('bulk_delete_' + name, description='Eliminar múltiples registros por ID')
            @require_permission(entity, 'delete')
            @_maybe_rate_limit
            def delete(self):
                try:
                    data = flask.request.get_json() or {}
                    ids = data.get('ids')
                    if not ids or not isinstance(ids, list):
                        return APIResponse.error('Se requiere lista de IDs', status_code=400)

                    count = model_class.bulk_delete(ids)
                    _cache_clear(model_class.__name__)
                    return APIResponse.success({'deleted_count': count}, message=f'{count} registros eliminados')
                except Exception as e:
                    db.session.rollback()
                    logger.error(f"Error bulk delete {model_class.__name__}: {e}", exc_info=True)
                    return APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)

    # ---- Stats ----
    if enable_stats and hasattr(model_class, 'get_stats'):
        @ns.route('/stats')
        class ModelStatsResource(Resource):
            @ns.doc('stats_' + name, description='Obtener estadísticas básicas del modelo')
            @_maybe_rate_limit
            def get(self):
                try:
                    stats = model_class.get_stats()
                    # Añadimos un meta vacío para mantener estructura predecible (facilita front genérico)
                    body, status = APIResponse.success(stats, message='Estadísticas obtenidas')
                    resp = flask_make_response(jsonify(body), status)
                    return resp
                except Exception as e:
                    logger.error(f"Error obteniendo stats {model_class.__name__}: {e}", exc_info=True)
                    body, status = APIResponse.error('Error interno del servidor', details={'error': str(e)}, status_code=500)
                    return flask_make_response(jsonify(body), status)

    return ns
