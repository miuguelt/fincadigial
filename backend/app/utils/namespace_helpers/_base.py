"""Helpers base del sistema CRUD optimizado — modelos swagger, parsing, etag."""

from flask_restx import Namespace, fields
from typing import Any
import logging

logger = logging.getLogger(__name__)


def _validate_sql_identifier(name: str) -> None:
    """Valida que un nombre sea un identificador SQL seguro."""
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
            'required': (column.name in model_required) or (
                not column.nullable and column.default is None and column.name not in ('id',)
            ),
        }
        py_type = getattr(column.type, 'python_type', None)
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
    input_fields = _field_definitions_for_model(model_class, exclude=['id', 'created_at', 'updated_at'])
    response_fields = _field_definitions_for_model(model_class, exclude=['password'])

    if 'password' in model_class.__table__.columns:
        is_required = 'password' in (getattr(model_class, '_required_fields', []) or [])
        input_fields['password'] = fields.String(description='Password (raw, will be hashed)', required=is_required)

    for fname, col in model_class.__table__.columns.items():
        is_enum = (hasattr(col.type, 'enums') or
                  str(col.type).startswith('ENUM') or
                  hasattr(col.type, 'enum_class') or
                  (hasattr(model_class, '_enum_fields') and fname in model_class._enum_fields))

        if is_enum:
            if fname in input_fields:
                if hasattr(model_class, '_enum_fields') and fname in model_class._enum_fields:
                    enum_class = model_class._enum_fields[fname]
                    enum_values = [e.value for e in enum_class]
                    description = f"{input_fields[fname].description}. Valores: {', '.join(enum_values)}"
                else:
                    description = input_fields[fname].description
                input_fields[fname] = fields.String(description=description, required=getattr(input_fields[fname], 'required', False))
            if fname in response_fields:
                response_fields[fname] = fields.String(description=response_fields[fname].description, required=False)

    input_model = ns.model(f'{model_class.__name__}Input', input_fields)
    response_model = ns.model(f'{model_class.__name__}Response', response_fields)
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
        'data': fields.List(fields.Nested(response_model), description='Lista paginada'),
        'meta': fields.Nested(ns.model('ListMeta', {
            'pagination': fields.Nested(pagination_model)
        }), description='Metadatos'),
    })
    return input_model, response_model, list_model


def _parse_bool(val: Any, default=False):
    if val is None:
        return default
    if isinstance(val, bool):
        return val
    return str(val).lower() in ('1', 'true', 'yes', 'y')


def _etag_scope(model_class) -> str:
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
