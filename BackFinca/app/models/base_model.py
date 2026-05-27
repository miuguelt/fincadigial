from app import db
from datetime import datetime, UTC
from sqlalchemy import inspect, or_, and_, desc, asc
from sqlalchemy.orm import selectinload
import logging
import enum as _enum
from typing import Any, cast
from collections.abc import Iterable

logger = logging.getLogger(__name__)


# Excepción simple para validaciones internas
class ValidationError(Exception):
    def __init__(self, message, code="validation_error", field=None, errors=None):
        super().__init__(message)
        self.message = message
        self.code = code
        self.field = field
        # Lista/dict opcional con los errores individuales para exponerlos en la respuesta
        self.errors = errors

class BaseModel(db.Model):
    """Clase base optimizada para modelos con funcionalidades de namespace.

    Mejoras recientes:
    - Método unificado to_json() para serialización consistente.
    - Conversión explícita de enums a sus valores (evita dependencias implícitas del encoder).
    - Eliminación de métodos duplicados (delete) y código redundante.
    - Normalización y validación de datos centralizada en `_validate_and_normalize`.
    """

    __abstract__ = True

    # Campos comunes para todos los modelos
    # Defaults en cliente y servidor para evitar errores en BD sin defaults
    created_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(UTC),              # client-side default
        server_default=db.func.now(),         # server-side default
        nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(UTC),              # client-side default
        onupdate=lambda: datetime.now(UTC),             # client-side onupdate
        server_default=db.func.now(),         # server-side default
        nullable=False
    )

    # Bloqueo Optimista para resolución de conflictos (Offline Sync)
    version_id = db.Column(db.Integer, default=1, server_default="1", nullable=False)

    # Soft Delete (Audit & Resilience)
    is_deleted = db.Column(db.Boolean, default=False, server_default="0", nullable=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

    # Audit Log (Traceability)
    created_by = db.Column(db.Integer, nullable=True)
    updated_by = db.Column(db.Integer, nullable=True)

    __mapper_args__ = {
        "version_id_col": version_id
    }

    # Configuraciones por defecto para namespaces (pueden ser sobreescritas en subclases)
    _namespace_fields: list[str] = []
    _namespace_relations: dict[str, Any] = {}
    _searchable_fields: list[str] = []
    _filterable_fields: list[str] = []
    _sortable_fields: list[str] = []
    _required_fields: list[str] = []
    _unique_fields: list[str] = []
    _enum_fields: dict[str, Any] = {}
    _allowed_input_fields: list[str] = []  # Campos extra permitidos para payloads (no columnas directas)

    # Configuración de caché para PWA (optimizado para diferentes tipos de datos)
    _cache_config = {
        'ttl': 120,  # TTL en segundos (2 minutos por defecto)
        'type': 'private',  # 'public' (compartido) o 'private' (por usuario)
        'strategy': 'stale-while-revalidate',  # estrategia para Service Worker
        'max_age': 120,  # max-age para Cache-Control header
        'stale_while_revalidate': 60,  # tiempo para usar caché stale mientras revalida
        'stale_if_error': 3600,  # permitir usar caché hasta 1h si el backend falla (modo offline)
    }

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        """
        Valida y normaliza los datos del payload. Centraliza la lógica de requeridos,
        únicos y enums.
        """
        errors = []
        incoming_data = dict(data or {})

        # 0. Manejar aliases de entrada (mapeo frontend -> backend)
        input_aliases = getattr(cls, '_input_aliases', {})
        if input_aliases:
            for alias, target in input_aliases.items():
                if alias in incoming_data and target not in incoming_data:
                    incoming_data[target] = incoming_data.pop(alias)

        # 0.1 Filtrar campos desconocidos para evitar errores de construcción
        allowed_fields = {col.name for col in cls.__table__.columns}
        extra_fields = getattr(cls, '_allowed_input_fields', []) or []
        allowed_fields.update(extra_fields)

        cleaned_data = {}
        dropped_fields = []
        for key, value in incoming_data.items():
            if key in allowed_fields:
                cleaned_data[key] = value
            else:
                dropped_fields.append(key)

        if dropped_fields:
            logger.warning(
                "DROPPED_FIELDS: %s is dropping fields from payload -> %s. Valid fields are: %s",
                cls.__name__,
                ', '.join(sorted(dropped_fields)),
                list(allowed_fields)
            )

        data: dict[str, Any] = cleaned_data

        # 0.2 Normalizar fechas automáticamente (str -> date/datetime)
        from datetime import date as py_date, datetime as py_datetime
        from sqlalchemy import DateTime as SA_DateTime
        for col in cls.__table__.columns:
            if isinstance(col.type, SA_DateTime):
                field_name = col.name
                if field_name in data and isinstance(data[field_name], str) and data[field_name]:
                    raw_value = data[field_name].replace('Z', '+00:00')
                    try:
                        data[field_name] = py_datetime.fromisoformat(raw_value)
                    except (ValueError, TypeError):
                        errors.append(f"El campo '{field_name}' debe tener formato ISO de fecha y hora")
                continue

            if hasattr(col.type, 'python_type') and col.type.python_type == py_date:
                field_name = col.name
                if field_name in data and isinstance(data[field_name], str) and data[field_name]:
                    try:
                        data[field_name] = py_date.fromisoformat(data[field_name])
                    except (ValueError, TypeError):
                        errors.append(f"El campo '{field_name}' debe tener formato YYYY-MM-DD")

        # 1. Normalizar y validar enums
        for field_raw, enum_class in cls._enum_fields.items():
            field = str(field_raw)
            if field in data and data[field] is not None:
                raw_value = data[field]
                if isinstance(raw_value, dict) and 'value' in raw_value:
                    raw_value = raw_value['value']

                if isinstance(enum_class, type) and isinstance(raw_value, enum_class):
                    data[str(field)] = raw_value # Ya es una instancia, no necesita más validación
                    continue

                try:
                    # Convertir string a instancia de enum
                    if callable(enum_class):
                        # Explicitly cast to Dict[str, Any] to satisfy strict linter
                        cast(dict[str, Any], data)[str(field)] = enum_class(raw_value)
                except (ValueError, TypeError):
                    if isinstance(enum_class, type) and hasattr(enum_class, '__iter__'):
                        valid_values = [str(e.value) for e in cast(Iterable[Any], enum_class)]
                        errors.append(f"El campo '{field}' debe ser uno de: {', '.join(valid_values)}")
                    else:
                        errors.append(f"El campo '{field}' tiene un valor inválido")

        # 2. Validar campos requeridos (solo en creación)
        if not is_update:
            for field in cls._required_fields:
                if data.get(field) is None or (isinstance(data.get(field), str) and not data.get(field)):
                    errors.append(f"El campo '{field}' es requerido")

        # 3. Validar campos únicos (tenant-aware)
        # Campos globales (email, identification) son únicos globalmente
        # Otros campos son únicos por finca en modelos tenant
        GLOBAL_UNIQUE_FIELDS = {'email', 'identification', 'phone'}  # User auth fields

        for field in cls._unique_fields:
            if field in data and data[field] is not None:
                query = cls.query.filter(getattr(cls, field) == data[field])

                # Para modelos tenant, agregar filtro de finca (excepto campos globales)
                from app.utils.tenant_context import TENANT_MODELS, get_current_finca_id
                if (cls.__name__ in TENANT_MODELS and
                    field not in GLOBAL_UNIQUE_FIELDS and
                    hasattr(cls, 'finca_id')):

                    # Usar finca_id de los datos o del contexto JWT
                    finca_id = data.get('finca_id') or get_current_finca_id()
                    if finca_id:
                        query = query.filter(cls.finca_id == finca_id)

                if is_update and instance_id:
                    query = query.filter(cls.id != instance_id)

                if query.first():
                    val = data.get(field)
                    errors.append(f"El valor '{val}' ya existe para el campo '{field}'")

        # 4. Validar y asegurar finca_id para modelos tenant (Aislamiento de Seguridad)
        from app.utils.tenant_context import TENANT_MODELS, get_current_finca_id, get_current_user_role
        if cls.__name__ in TENANT_MODELS and hasattr(cls, 'finca_id'):
            user_role = get_current_user_role()
            finca_id = get_current_finca_id()
            import flask
            is_admin = (
                (flask.has_app_context() and getattr(flask.g, 'is_admin', False))
                or (user_role == 'Administrador' and finca_id is None)
                or (flask.has_app_context() and flask.current_app.config.get('TESTING', False))
                or not flask.has_request_context()
            )

            if is_admin:
                # El administrador global puede elegir la finca. Si no la envía, se usa la del contexto.
                if data.get('finca_id') is None:
                    f_id = get_current_finca_id()
                    if f_id:
                        data['finca_id'] = f_id
                    elif not is_update:
                        errors.append("El campo 'finca_id' es requerido para garantizar el aislamiento de datos (Multi-Tenant)")
            else:
                # Para roles no administrativos, se FUERZA siempre su finca_id de JWT para evitar inyección cross-tenant
                f_id = get_current_finca_id()
                if f_id:
                    data['finca_id'] = f_id
                elif data.get('finca_id') is not None:
                    # Permitir finca_id explícito si no hay sesión JWT (petición pública / registro inicial)
                    pass
                elif not is_update:
                    errors.append("El campo 'finca_id' es requerido para garantizar el aislamiento de datos (Multi-Tenant)")

        if errors:
            # Guardar listado de errores para que los controladores puedan retornarlos
            raise ValidationError('; '.join(errors), code="validation_error", errors=errors)

        return data

    def to_ai_context(self, include_relations=True, depth=1):
        """
        Genera una representación semántica del modelo optimizada para inyectar en prompts de IA.
        Sigue el patrón: [Entidad] [Identificador]: [Descripción de campos clave] [Relaciones clave].
        """
        # 1. Identificar el nombre legible de la entidad
        entity_name = self.__class__.__name__
        if entity_name.endswith('s') and not entity_name.endswith('ss'):
            entity_name = entity_name[:-1] # Des-pluralizar simple (Animal -> Animals)

        # 2. Identificador principal (record, name, o id)
        identity = f"ID {self.id}"
        if hasattr(self, 'record'):
            identity = f"registro '{self.record}'"
        elif hasattr(self, 'name'):
            identity = f"'{self.name}'"

        context_parts = [f"{entity_name} {identity}"]

        # 3. Campos clave (ignorar timestamps y IDs técnicos)
        fields_to_include = self._namespace_fields if self._namespace_fields else [col.name for col in self.__table__.columns]
        ignored_fields = {'id', 'created_at', 'updated_at', 'password_hash'}

        field_descriptions = []
        for field_raw in fields_to_include:
            field = str(field_raw)
            if field in ignored_fields or field.endswith('_id'):
                continue

            value = getattr(self, field, None)
            if value is None:
                continue

            # Formatear el valor según su tipo
            from datetime import date, datetime
            if isinstance(value, (date, datetime)):
                val_str = value.isoformat()
            elif isinstance(value, _enum.Enum):
                val_str = value.value
            else:
                val_str = str(value)

            field_label = field.replace('_', ' ')
            field_descriptions.append(f"{field_label}: {val_str}")

        if field_descriptions:
            context_parts.append(f"con las siguientes características: {', '.join(field_descriptions)}.")

        # 4. Relaciones clave (si se solicita y depth>0)
        if include_relations and depth > 0 and hasattr(self, '_namespace_relations'):
            rel_summaries = []
            namespace_rels = getattr(self, '_namespace_relations', {})
            for rel_name_raw in namespace_rels.keys():
                rel_name = str(rel_name_raw)
                if hasattr(self, rel_name):
                    rel_obj = getattr(self, rel_name)
                    if rel_obj is None:
                        continue

                    try:
                        if hasattr(rel_obj, 'all'): # Dinámica
                            count = rel_obj.count()
                            if count > 0:
                                rel_summaries.append(f"tiene {count} {rel_name}")
                        elif isinstance(rel_obj, list):
                            if len(rel_obj) > 0:
                                rel_summaries.append(f"tiene {len(rel_obj)} {rel_name}")
                        else: # Objeto único
                            rel_identity = f"id {rel_obj.id}"
                            if hasattr(rel_obj, 'name'): rel_identity = rel_obj.name
                            elif hasattr(rel_obj, 'record'): rel_identity = rel_obj.record
                            rel_summaries.append(f"está relacionado con {rel_name} '{rel_identity}'")
                    except Exception:
                        continue

            if rel_summaries:
                context_parts.append(f"Actualmente {' y '.join(rel_summaries)}.")

        return " ".join(context_parts)

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        """
        Serializa el modelo a un dict listo para respuesta JSON.
        Delega la serialización de valores al JSONEncoder centralizado.
        """
        from app.utils.json_utils import JSONEncoder

        # Lista negra global de campos sensibles (Hardening)
        SENSITIVE_FIELDS = {'password_hash', 'password', 'token', 'secret_key', 'private_key', 'apiKey'}

        # Filtrar campos si se solicitan o usar definidos en namespace
        if fields is None:
            if hasattr(self, '_namespace_fields') and self._namespace_fields:
                target_fields = [f for f in self._namespace_fields if f not in SENSITIVE_FIELDS]
            else:
                target_fields = [col.name for col in self.__table__.columns if col.name not in SENSITIVE_FIELDS]
        else:
            target_fields = [f for f in fields if f not in SENSITIVE_FIELDS]

        data = {field: JSONEncoder.serialize(getattr(self, field, None)) for field in target_fields}

        # Relaciones (solo si se solicita y depth>0)
        if include_relations and depth > 0:
            for rel_name, cfg in self._namespace_relations.items():
                if hasattr(self, rel_name):
                    rel_obj = getattr(self, rel_name)
                    rel_fields = cfg.get('fields')

                    try:
                        if rel_obj is None:
                            data[rel_name] = None
                        elif hasattr(rel_obj, 'all'):  # Relación dinámica (lazy='dynamic')
                            data[rel_name] = [
                                item.to_namespace_dict(include_relations=False, depth=depth-1, fields=rel_fields)
                                for item in rel_obj.limit(50)  # Límite defensivo
                            ]
                        elif isinstance(rel_obj, list):
                            data[rel_name] = [
                                item.to_namespace_dict(include_relations=False, depth=depth-1, fields=rel_fields)
                                for item in rel_obj
                            ]
                        else: # Relación a un solo objeto
                            data[rel_name] = rel_obj.to_namespace_dict(
                                include_relations=False, depth=depth-1, fields=rel_fields
                            )
                    except Exception as e:
                        logger.debug(f"Error serializando relación {rel_name} en {self.__class__.__name__}: {e}")
                        data[rel_name] = None
        return data

    # Alias explícito usado por algunos serializadores
    def to_json(self):  # pragma: no cover - simple delegación
        return self.to_namespace_dict()

    @classmethod
    def get_namespace_query(cls, filters=None, search=None, search_type='auto', sort_by=None, sort_order='asc',
                           page=None, per_page=None, include_relations=False):  # per_page retained for backward compat
        """Construir consulta optimizada para namespaces con filtrado multi-tenant."""
        query = cls.query

        # Aplicar filtro de tenant (finca) para modelos tenant-aware
        # Esto protege automáticamente todos los namespaces respetando el bypass de Administrador
        from app.utils.tenant_context import apply_tenant_filter
        query = apply_tenant_filter(query, cls)

        # Aplicar filtro de Soft Delete (por defecto no mostrar eliminados)
        if hasattr(cls, 'is_deleted'):
            query = query.filter(cls.is_deleted == False)

        # Eager load de relaciones si se solicitan o si hay propiedades que las necesitan (evita N+1)
        # Identificar qué relaciones cargar basándose en include_relations y campos solicitados
        relations_to_load = []
        if include_relations:
            relations_to_load = list(cls._namespace_relations.keys())
        else:
            # Heurística: si se solicita un campo que sabemos que es una relación o depende de ella
            import flask
            requested_fields = []
            if flask.has_request_context():
                requested_fields = flask.request.args.get('fields', '').split(',')
            # Por ejemplo, si se solicita 'current_field_name' en Animals, cargar 'animal_fields'
            dependency_map = getattr(cls, '_property_dependencies', {})
            for field in requested_fields:
                if field in dependency_map:
                    rel = dependency_map[field]
                    if rel not in relations_to_load:
                        relations_to_load.append(rel)

        if relations_to_load:
            try:
                for relation_name in relations_to_load:
                    if hasattr(cls, relation_name):
                        relation_attr = getattr(cls, relation_name)
                        # Saltar relaciones dinámicas
                        if hasattr(relation_attr.property, 'lazy') and relation_attr.property.lazy == 'dynamic':
                            continue
                        query = query.options(selectinload(relation_attr))
            except Exception as e:
                logger.debug(f"Error aplicando eager loading en {cls.__name__}: {e}")

        # Aplicar filtros
        if filters:
            filter_conditions = []
            for key, value in filters.items():
                # Filtro especial para delta sync (sincronización incremental)
                if key == '_since':
                    # Filtrar por updated_at >= since_date (registros modificados desde timestamp)
                    if hasattr(cls, 'updated_at'):
                        filter_conditions.append(cls.updated_at >= value)
                        logger.debug(f"Delta sync filter: {cls.__name__}.updated_at >= {value}")
                    continue

                if key in cls._filterable_fields and hasattr(cls, key):
                    if isinstance(value, list):
                        filter_conditions.append(getattr(cls, key).in_(value))
                        logger.debug(f"Filtro aplicado: {cls.__name__}.{key} IN {value}")
                    else:
                        filter_conditions.append(getattr(cls, key) == value)
                        logger.debug(f"Filtro aplicado: {cls.__name__}.{key} == {value}")
                else:
                    logger.warning(f"Filtro ignorado: {key} no está en _filterable_fields de {cls.__name__}")

            if filter_conditions:
                query = query.filter(and_(*filter_conditions))

        # Aplicar búsqueda
        if search:
            search_conditions = []
            # Búsqueda por texto en campos configurados
            for field in cls._searchable_fields:
                if hasattr(cls, field):
                    search_conditions.append(getattr(cls, field).ilike(f'%{search}%'))

            if search_conditions:
                query = query.filter(or_(*search_conditions))

        # Aplicar ordenamiento
        if sort_by and sort_by in cls._sortable_fields and hasattr(cls, sort_by):
            order_func = asc if sort_order.lower() == 'asc' else desc
            query = query.order_by(order_func(getattr(cls, sort_by)))
        else:
            # Orden por defecto
            try:
                query = query.order_by(desc(cls.updated_at))
            except Exception:
                query = query.order_by(desc(cls.id))

        # Aplicar paginación
        if page and per_page:
            query = query.paginate(page=page, per_page=per_page, error_out=False)

        return query

    @classmethod
    def get_paginated_response(cls, query_result, include_relations=False, depth=1):
        """Convertir resultado paginado a respuesta de namespace"""
        if hasattr(query_result, 'items'):
            items = [item.to_namespace_dict(include_relations=include_relations, depth=depth)
                    for item in query_result.items]
            return {
                'items': items,
                'total_items': query_result.total,
                'limit': query_result.per_page,
                'per_page': query_result.per_page,
                'page': query_result.page,
                'total_pages': query_result.pages,
                'has_next_page': query_result.has_next,
                'has_previous_page': query_result.has_prev,
            }
        else:
            items = [item.to_namespace_dict(include_relations=include_relations, depth=depth)
                    for item in query_result]
            return {
                'items': items,
                'total_items': len(items),
                'limit': len(items),
                'per_page': len(items),
                'page': 1,
                'total_pages': 1,
                'has_next_page': False,
                'has_previous_page': False,
            }

    @classmethod
    def bulk_create(cls, items_data):
        """Crear múltiples instancias de forma optimizada con sincronización completa."""
        instances = [cls(**cls._validate_and_normalize(data)) for data in items_data]
        db.session.add_all(instances)
        db.session.flush()
        db.session.commit()
        for instance in instances:
            db.session.refresh(instance)
        return instances

    @classmethod
    def bulk_update(cls, updates_data):
        """Actualizar múltiples instancias de forma optimizada con sincronización completa."""
        from app.utils.tenant_context import apply_tenant_filter
        updated_instances = []
        for update_data in updates_data:
            instance_id = update_data.get('id')
            if not instance_id: continue

            instance = apply_tenant_filter(db.session.query(cls), cls).filter(cls.id == instance_id).first()
            if not instance: continue

            data_to_update = {k: v for k, v in update_data.items() if k != 'id'}
            normalized_data = cls._validate_and_normalize(data_to_update, is_update=True, instance_id=instance_id)

            for key, value in normalized_data.items():
                if hasattr(instance, key):
                    setattr(instance, key, value)
            updated_instances.append(instance)

        db.session.flush()
        db.session.commit()
        for instance in updated_instances:
            db.session.refresh(instance)
        return updated_instances

    @classmethod
    def bulk_delete(cls, ids: list[int], hard_delete: bool = False) -> int:
        """Elimina múltiples instancias por ID con aislamiento multi-tenant."""
        from app.utils.tenant_context import apply_tenant_filter
        count = 0
        instances = apply_tenant_filter(cls.query, cls).filter(cls.id.in_(ids)).all()
        for instance in instances:
            instance.delete(commit=False, hard_delete=hard_delete)
            count += 1
        db.session.commit()
        return count

    def save(self, commit=True):
        """Persistir cambios en DB."""
        try:
            self.updated_at = datetime.now(UTC)
        except Exception: pass
        db.session.add(self)
        db.session.flush()
        if commit:
            db.session.commit()
            try: db.session.refresh(self)
            except Exception: pass
        return self

    def delete(self, commit=True, hard_delete=False):
        """Elimina la instancia (soft delete por defecto)."""
        if hard_delete:
            db.session.delete(self)
        else:
            self.is_deleted = True
            self.deleted_at = datetime.now(UTC)
            db.session.add(self)
        if commit:
            db.session.commit()
        return True

    def restore(self, commit=True):
        """Restaura una instancia eliminada."""
        self.is_deleted = False
        self.deleted_at = None
        if commit:
            db.session.commit()
        return self

    @classmethod
    def get_or_create(cls, **kwargs):
        instance = cls.query.filter_by(**kwargs).first()
        if instance: return instance, False
        instance = cls(**kwargs)
        instance.save()
        return instance, True

    @classmethod
    def exists(cls, **kwargs):
        return cls.query.filter_by(**kwargs).first() is not None

    def refresh(self):
        db.session.refresh(self)
        return self

    @property
    def is_new(self):
        return inspect(self).transient

    @classmethod
    def get_by_id(cls, record_id, include_relations=False):
        """Obtener instancia por ID con multi-tenant."""
        from app.utils.tenant_context import apply_tenant_filter
        query = apply_tenant_filter(cls.query, cls)
        if include_relations:
            for relation_name in cls._namespace_relations.keys():
                if hasattr(cls, relation_name):
                    relation_attr = getattr(cls, relation_name)
                    if hasattr(relation_attr.property, 'lazy') and relation_attr.property.lazy == 'dynamic':
                        continue
                    query = query.options(selectinload(relation_attr))
        return query.filter_by(id=record_id).first()

    @classmethod
    def create(cls, commit=True, **kwargs):
        """Crear registro con validación."""
        normalized_data = cls._validate_and_normalize(kwargs, is_update=False)
        instance = cls(**normalized_data)
        instance.save(commit=commit)
        return instance

    def update(self, commit=True, **kwargs):
        """Actualizar registro con validación."""
        normalized_data = self.__class__._validate_and_normalize(kwargs, is_update=True, instance_id=self.id)
        for key, value in normalized_data.items():
            if hasattr(self, key):
                setattr(self, key, value)
        if commit: self.save()
        return self

    @classmethod
    def get_all(cls, include_relations=False):
        """Obtener todos con multi-tenant."""
        from app.utils.tenant_context import apply_tenant_filter
        query = apply_tenant_filter(cls.query, cls)
        if include_relations:
            for relation_name in cls._namespace_relations.keys():
                if hasattr(cls, relation_name):
                    relation_attr = getattr(cls, relation_name)
                    if hasattr(relation_attr.property, 'lazy') and relation_attr.property.lazy == 'dynamic':
                        continue
                    query = query.options(selectinload(relation_attr))
        return query.all()

    @classmethod
    def count(cls, **filters):
        """Contar con multi-tenant."""
        from app.utils.tenant_context import apply_tenant_filter
        query = apply_tenant_filter(cls.query, cls)
        if filters: query = query.filter_by(**filters)
        return query.count()

    @classmethod
    def search(cls, search_term, fields=None, limit=50):
        """Búsqueda simple con multi-tenant."""
        from app.utils.tenant_context import apply_tenant_filter
        if not fields: fields = cls._searchable_fields
        if not fields: return []
        search_filters = [getattr(cls, f).ilike(f'%{search_term}%') for f in fields if hasattr(cls, f)]
        if search_filters:
            return apply_tenant_filter(cls.query, cls).filter(or_(*search_filters)).limit(limit).all()
        return []

    @classmethod
    def get_stats(cls):
        """Estadísticas básicas con multi-tenant."""
        total_count = cls.count()
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)
        from app.utils.tenant_context import apply_tenant_filter
        recent_count = apply_tenant_filter(cls.query, cls).filter(cls.created_at >= today_start).count()
        return {
            'total': total_count,
            'recent_today': recent_count,
            'model_name': cls.__name__
        }
