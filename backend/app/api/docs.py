import logging
import importlib
import pkgutil
import pathlib
from datetime import datetime, timezone
import flask
from ..utils.response_handler import APIResponse

def register_docs_routes(api_bp):
    
    @api_bp.route('/docs/schema', methods=['GET'])
    def docs_schema():
        """Devolver metadatos dinámicos enriquecidos de modelos y namespaces."""
        # Intentar importar todas las clases de modelo registradas como subclases de BaseModel
        imported_any = False
        try:
            model_pkg = 'app.models'
            pkg = importlib.import_module(model_pkg)
            for _finder, name, _ispkg in pkgutil.iter_modules(pkg.__path__):
                try:
                    importlib.import_module(f"{model_pkg}.{name}")
                    imported_any = True
                except Exception:
                    logging.getLogger(__name__).debug('No se pudo importar modelo: %s', name, exc_info=True)
        except Exception:
            logging.getLogger(__name__).debug('app.models no es un paquete importable', exc_info=True)

        if not imported_any:
            try:
                base_dir = pathlib.Path(__file__).parents[1]
                models_dir = base_dir / 'models'
                if models_dir.exists() and models_dir.is_dir():
                    for p in models_dir.iterdir():
                        if p.is_file() and p.suffix == '.py' and p.name != '__init__.py':
                            mod_name = p.stem
                            try:
                                importlib.import_module(f"app.models.{mod_name}")
                                imported_any = True
                            except Exception:
                                logging.getLogger(__name__).debug('No se pudo importar modelo desde archivo: %s', p.name, exc_info=True)
            except Exception:
                logging.getLogger(__name__).warning('No se pudo escanear app/models')

        model_classes = []
        try:
            from ..models.base_model import BaseModel
            for s in BaseModel.__subclasses__():
                model_classes.append(s)
        except Exception as e:
            logging.getLogger(__name__).warning('Error listando modelos: %s', e)

        def _example_value(col_type_str: str):
            t = col_type_str.lower()
            if 'int' in t: return 123
            if 'bool' in t: return True
            if 'date' in t: return '2025-01-01'
            if 'enum' in t: return 'VALUE'
            if 'float' in t or 'numeric' in t or 'dec' in t: return 1.23
            return 'texto'

        def serialize_model(cls):
            data = {
                'model': cls.__name__,
                'table': getattr(cls, '__tablename__', None),
                'fields': [],
                'filterable': getattr(cls, '_filterable_fields', []),
                'searchable': getattr(cls, '_searchable_fields', []),
                'sortable': getattr(cls, '_sortable_fields', []),
                'required': getattr(cls, '_required_fields', []),
                'unique': getattr(cls, '_unique_fields', []),
                'enums': {},
                'relations': {},
                'examples': {},
            }
            create_example = {}
            update_example = {}
            try:
                def _sanitize_value(v):
                    import datetime as _dt
                    import enum as _enum
                    if v is None: return None
                    if isinstance(v, _enum.Enum): return v.value
                    if isinstance(v, (_dt.datetime, _dt.date)): return v.isoformat()
                    if callable(v): return str(v)
                    if isinstance(v, dict): return {k: _sanitize_value(val) for k, val in v.items()}
                    if isinstance(v, (list, tuple, set)): return [_sanitize_value(x) for x in v]
                    return v

                for col in cls.__table__.columns:
                    col_type = str(col.type)
                    raw_default = getattr(col.default, 'arg', None) if col.default is not None else None
                    default_val = _sanitize_value(raw_default) if not callable(raw_default) else str(raw_default)
                    
                    data['fields'].append({
                        'name': col.name,
                        'type': col_type,
                        'nullable': col.nullable,
                        'primary_key': col.primary_key,
                        'default': default_val,
                    })
                    if not col.primary_key and col.name not in ('created_at', 'updated_at'):
                        if col.name in data['required']:
                            create_example[col.name] = _example_value(col_type)
                        else:
                            create_example[col.name] = 'ENUM_VALUE' if col.name in getattr(cls, '_enum_fields', {}) else _example_value(col_type)
                        if len(update_example) < 3:
                            update_example[col.name] = _example_value(col_type)
                
                for fname, enum_cls in getattr(cls, '_enum_fields', {}).items():
                    try:
                        values = [e.value for e in enum_cls]
                        data['enums'][fname] = values
                        if fname in create_example: create_example[fname] = values[0] if values else None
                    except Exception: pass
                
                for rel_name, rel_cfg in getattr(cls, '_namespace_relations', {}).items():
                    data['relations'][rel_name] = {'fields': rel_cfg.get('fields'), 'depth': rel_cfg.get('depth', 1)}
                
                data['examples'] = {
                    'create': {k: _sanitize_value(v) for k, v in create_example.items()},
                    'update': {k: _sanitize_value(v) for k, v in update_example.items()},
                }
            except Exception: return data
            return data

        return flask.jsonify({
            'success': True,
            'message': 'Esquema dinámico generado',
            'data': {
                'models': [serialize_model(m) for m in model_classes],
                'timestamp': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            },
            'status_code': 200,
        }), 200

    @api_bp.route('/docs/examples', methods=['GET'])
    def docs_examples():
        schema_resp = docs_schema()[0].json
        examples = []
        for m in schema_resp['data']['models']:
            model = m.get('model')
            create_ex = m.get('examples', {}).get('create', {}) or {}
            required = m.get('required', []) or []
            enums = m.get('enums', {}) or {}
            field_types = {f['name']: f.get('type', '').lower() for f in (m.get('fields') or [])}
            
            for req in required:
                if req not in create_ex or create_ex.get(req) in (None, ''):
                    if req in enums and enums[req]: create_ex[req] = enums[req][0]
                    else:
                        ftype = field_types.get(req, '')
                        if 'date' in ftype: create_ex[req] = '2025-01-01'
                        elif 'int' in ftype: create_ex[req] = 1
                        elif 'bool' in ftype: create_ex[req] = True
                        else: create_ex[req] = 'example'
            
            table = m.get('table') or (model or '').lower()
            endpoint_base = table if str(table).endswith('s') else f"{table}s"
            
            examples.append({
                'model': model,
                'create_request': create_ex,
                'create_endpoint': f"/api/v1/{endpoint_base}/",
                'list_example': f"GET /api/v1/{endpoint_base}/?page=1&limit=10",
                'filters_available': m.get('filterable', []),
                'searchable': m.get('searchable', []),
                'sortable': m.get('sortable', []),
            })
        return flask.jsonify({'success': True, 'data': {'examples': examples}}), 200

    @api_bp.route('/docs/guia-frontend', methods=['GET'])
    def docs_frontend_guide():
        try:
            md_path = pathlib.Path(__file__).parents[2] / 'docs' / 'api-usage-guia-frontend.md'
            if not md_path.exists():
                return "# Guía Frontend\n\nNo encontrada.", 200, {'Content-Type': 'text/markdown; charset=utf-8'}
            return flask.send_file(str(md_path), mimetype='text/markdown; charset=utf-8')
        except Exception as e:
            return flask.jsonify({'success': False, 'message': 'Error sirviendo la guía', 'details': str(e)}), 500

    @api_bp.route('/docs/guia-frontend-html', methods=['GET'])
    def docs_frontend_guide_html():
        return flask.render_template('guia_frontend.html', title='Guía Frontend')
