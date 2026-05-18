from app import db
import enum
from app.models.base_model import BaseModel, ValidationError

class LandStatus(enum.Enum):
    """Estados posibles para los campos/potreros"""
    Disponible = "Disponible"
    Ocupado = "Ocupado"
    Mantenimiento = "Mantenimiento"
    Restringido = "Restringido"
    Dañado = "Dañado"
    Activo = "Activo"
    
    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]
        
    def __str__(self):
        """Devuelve el valor como string para facilitar la conversión"""
        return str(self.value)
        
    def __repr__(self):
        """Representación detallada para debug"""
        return f"{self.__class__.__name__}.{self.name}"

class Fields(BaseModel):
    """Modelo para campos/potreros de la finca optimizado para namespaces"""
    __tablename__ = "fields"
    
    __table_args__ = (
        db.UniqueConstraint('name', 'finca_id', name='uq_fields_name_finca'),
        db.Index('ix_fields_finca_id', 'finca_id'),
    )
    
    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    # NOTE: DB schema enforces NOT NULL for several columns; keep model aligned to avoid 409 IntegrityErrors.
    ubication = db.Column(db.String(255), nullable=True)
    capacity = db.Column(db.String(255), nullable=True)
    state = db.Column(db.Enum(LandStatus), nullable=False, default=LandStatus.Activo)
    handlings = db.Column(db.String(255), nullable=True)
    gauges = db.Column(db.String(255), nullable=True)
    area = db.Column(db.String(255), nullable=False, default="0")
    food_type_id = db.Column(db.Integer, db.ForeignKey('food_types.id'), nullable=True)
    finca_id     = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)
    
    # Coordenadas para Geofencing
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    radius_meters = db.Column(db.Float, default=50.0) # Radio de influencia/alerta

    # Campos de Rotación y Sostenibilidad
    last_grazing_date = db.Column(db.Date, nullable=True)
    rest_days = db.Column(db.Integer, default=30) # Días de descanso necesarios
    grazing_days = db.Column(db.Integer, default=3) # Días de ocupación recomendados
    
    @property
    def is_grazing_ready(self):
        """Verifica si el potrero ya descansó lo suficiente."""
        if not self.last_grazing_date:
            return True
        from datetime import date
        days_passed = (date.today() - self.last_grazing_date).days
        return days_passed >= (self.rest_days or 30)

    @property
    def rest_days_remaining(self):
        """Días que le faltan de descanso."""
        if not self.last_grazing_date:
            return 0
        from datetime import date
        days_passed = (date.today() - self.last_grazing_date).days
        remaining = (self.rest_days or 30) - days_passed
        return max(0, remaining)

    # Configuración específica para namespaces
    _namespace_fields = ['id', 'name', 'ubication', 'capacity', 'state', 'handlings', 'gauges', 'area', 'food_type_id', 'finca_id', 'animal_count', 'latitude', 'longitude', 'radius_meters', 'last_grazing_date', 'rest_days', 'grazing_days', 'is_grazing_ready', 'rest_days_remaining', 'created_at']
    _namespace_relations = {
        'food_types': {'fields': ['id', 'food_type', 'handlings'], 'depth': 1},
        'animal_fields': {'fields': ['id', 'animal_id'], 'depth': 1}
    }
    _searchable_fields = ['name', 'ubication', 'handlings']
    _filterable_fields = ['state', 'food_type_id', 'capacity', 'area', 'finca_id', 'created_at']
    _sortable_fields = ['id', 'name', 'capacity', 'area', 'created_at', 'updated_at']
    # Required fields aligned with DB NOT NULL constraints
    _required_fields = ['name', 'state', 'area']
    _unique_fields = []
    _input_aliases = {
        'location': 'ubication',
        'management': 'handlings',
        'measurements': 'gauges'
    }
    _enum_fields = {'state': LandStatus}

    # Relaciones optimizadas
    animal_fields = db.relationship('AnimalFields', back_populates='field', lazy='dynamic')
    food_types = db.relationship('FoodTypes', back_populates='fields', lazy='selectin')

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        """Override para agregar cantidad de animales asignados al campo.

        Acepta y propaga "depth" y "fields" para mantener compatibilidad con BaseModel.
        """
        # Obtener el diccionario base del método padre respetando profundidad y selección de campos
        data = super().to_namespace_dict(include_relations=include_relations, depth=depth, fields=fields)

        # Agregar conteo de animales actualmente asignados a este campo
        # Usa la relación lazy='dynamic' que ya está optimizada
        prefetched = getattr(self, "_prefetched_animal_count", None)
        if prefetched is not None:
            animal_count = prefetched
        else:
            animal_count = self.animal_fields.filter_by(removal_date=None).count()

        data['animal_count'] = animal_count

        return data

    @classmethod
    def get_paginated_response(cls, query_result, include_relations=False, depth=1):
        """Optimiza serialización de listados precargando animal_count en 1 query.

        Evita N+1 queries cuando Fields.to_namespace_dict calcula conteos por instancia.
        """
        # Obtener instancias
        if hasattr(query_result, "items"):
            instances = list(query_result.items)
        else:
            instances = list(query_result)

        # Precargar conteos de animales activos por campo en una sola consulta
        try:
            from sqlalchemy import func
            from app.models.animalFields import AnimalFields

            field_ids = [inst.id for inst in instances if getattr(inst, "id", None) is not None]
            counts = {}
            if field_ids:
                rows = (
                    db.session.query(AnimalFields.field_id, func.count(AnimalFields.id))
                    .filter(AnimalFields.field_id.in_(field_ids), AnimalFields.removal_date.is_(None))
                    .group_by(AnimalFields.field_id)
                    .all()
                )
                counts = {fid: int(cnt) for fid, cnt in rows}

            for inst in instances:
                if getattr(inst, "id", None) is not None:
                    inst._prefetched_animal_count = counts.get(inst.id, 0)
        except Exception:
            pass

        items = [inst.to_namespace_dict(include_relations=include_relations, depth=depth) for inst in instances]

        if hasattr(query_result, "items"):
            return {
                "items": items,
                # legacy keys
                "total": query_result.total,
                "page": query_result.page,
                "per_page": query_result.per_page,
                "pages": query_result.pages,
                "has_next": query_result.has_next,
                "has_prev": query_result.has_prev,
                # new unified keys
                "total_items": query_result.total,
                "limit": query_result.per_page,
                "total_pages": query_result.pages,
                "has_next_page": query_result.has_next,
                "has_previous_page": query_result.has_prev,
            }

        return {
            "items": items,
            # legacy keys
            "total": len(items),
            "page": 1,
            "per_page": len(items),
            "pages": 1,
            "has_next": False,
            "has_prev": False,
            # new unified keys
            "total_items": len(items),
            "limit": len(items),
            "total_pages": 1,
            "has_next_page": False,
            "has_previous_page": False,
        }

    def __repr__(self):
        return f'<Field {self.id}: {self.name}>'
