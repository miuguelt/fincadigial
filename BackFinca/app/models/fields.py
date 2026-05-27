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
        return str(self.value)

    def __repr__(self):
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
    radius_meters = db.Column(db.Float, default=50.0)

    # Campos de Rotación y Sostenibilidad
    last_grazing_date = db.Column(db.Date, nullable=True)
    rest_days = db.Column(db.Integer, default=30)
    grazing_days = db.Column(db.Integer, default=3)

    @property
    def capacity_num(self) -> int:
        """Retorna capacidad como entero (0 si no válida)."""
        try:
            return int(self.capacity) if self.capacity else 0
        except (ValueError, TypeError):
            return 0

    @property
    def area_num(self) -> float:
        """Retorna área como float (0.0 si no válida)."""
        try:
            return float(self.area) if self.area else 0.0
        except (ValueError, TypeError):
            return 0.0

    @property
    def occupancy_rate(self) -> float:
        """Porcentaje de ocupación (0-100)."""
        if self.capacity_num == 0:
            return 0.0
        count = getattr(self, "_prefetched_animal_count", None)
        if count is None:
            from app.models.animals import Animals, AnimalStatus
            from app.models.animalFields import AnimalFields
            count = self.animal_fields.join(Animals).filter(
                AnimalFields.removal_date == None,
                AnimalFields.is_deleted == False,
                Animals.is_deleted == False,
                Animals.status == AnimalStatus.Vivo
            ).count()
        return min(round((count / self.capacity_num) * 100, 1), 100.0)

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
    _namespace_fields = ['id', 'name', 'ubication', 'capacity', 'state', 'handlings', 'gauges', 'area', 'food_type_id', 'finca_id', 'animal_count', 'latitude', 'longitude', 'radius_meters', 'last_grazing_date', 'rest_days', 'grazing_days', 'is_grazing_ready', 'rest_days_remaining', 'capacity_num', 'area_num', 'occupancy_rate', 'created_at', 'updated_at']
    _namespace_relations = {
        'food_types': {'fields': ['id', 'food_type', 'handlings'], 'depth': 1},
        'animal_fields': {'fields': ['id', 'animal_id'], 'depth': 1}
    }
    _searchable_fields = ['name', 'ubication', 'handlings', 'area', 'capacity']
    _filterable_fields = ['state', 'food_type_id', 'capacity', 'area', 'finca_id', 'created_at']
    _sortable_fields = ['id', 'name', 'capacity', 'area', 'state', 'created_at', 'updated_at']
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

    @classmethod
    def _validate_namespace_data(cls, data):
        """Validación estándar del modelo."""
        errors = []

        if not data.get('name', '').strip():
            errors.append("El nombre es obligatorio")

        if not data.get('area', '').strip():
            errors.append("El área es obligatoria")

        capacity = data.get('capacity')
        if capacity and capacity.strip():
            try:
                cap = int(capacity)
                if cap <= 0:
                    errors.append("La capacidad debe ser mayor a 0")
            except ValueError:
                errors.append("La capacidad debe ser un número entero válido")

        state = data.get('state')
        if state and state not in [e.value for e in LandStatus]:
            errors.append(f"Estado inválido: {state}. Opciones: {', '.join(e.value for e in LandStatus)}")

        if errors:
            raise ValidationError('; '.join(errors), code="validation_error")

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        """Override para agregar cantidad de animales asignados al campo y métricas calculadas."""
        data = super().to_namespace_dict(include_relations=include_relations, depth=depth, fields=fields)

        prefetched = getattr(self, "_prefetched_animal_count", None)
        if prefetched is not None:
            animal_count = prefetched
        else:
            from app.models.animals import Animals, AnimalStatus
            from app.models.animalFields import AnimalFields
            animal_count = self.animal_fields.join(Animals).filter(
                AnimalFields.removal_date == None,
                AnimalFields.is_deleted == False,
                Animals.is_deleted == False,
                Animals.status == AnimalStatus.Vivo
            ).count()

        data['animal_count'] = animal_count
        data['capacity_num'] = self.capacity_num
        data['area_num'] = self.area_num
        data['occupancy_rate'] = self.occupancy_rate

        return data

    @classmethod
    def get_namespace_query(cls, filters=None, search=None, search_type='auto', sort_by=None, sort_order='asc',
                           page=None, per_page=None, include_relations=False):
        """Override para soportar ordenamiento por animal_count."""
        if sort_by == 'animal_count':
            from app.models.animals import Animals, AnimalStatus
            from app.models.animalFields import AnimalFields
            from sqlalchemy import func, desc, asc

            # Subconsulta para contar animales activos por potrero
            animal_counts = (
                db.session.query(AnimalFields.field_id, func.count(AnimalFields.id).label('acount'))
                .join(Animals, AnimalFields.animal_id == Animals.id)
                .filter(
                    AnimalFields.removal_date.is_(None),
                    AnimalFields.is_deleted == False,
                    Animals.is_deleted == False,
                    Animals.status == AnimalStatus.Vivo
                )
                .group_by(AnimalFields.field_id)
                .subquery()
            )

            # Construir consulta base (reusando filtros de BaseModel)
            # Llamamos a super() con sort_by=None para aplicar filtros sin ordenar aún
            query = super().get_namespace_query(filters, search, search_type, None, sort_order, None, None, include_relations)
            
            # Join con los conteos y ordenar
            query = query.outerjoin(animal_counts, cls.id == animal_counts.c.field_id)
            
            order_func = asc if sort_order.lower() == 'asc' else desc
            # Coalesce para tratar nulos como 0
            query = query.order_by(order_func(func.coalesce(animal_counts.c.acount, 0)), desc(cls.id))
            
            if page and per_page:
                return query.paginate(page=page, per_page=per_page, error_out=False)
            return query
            
        return super().get_namespace_query(filters, search, search_type, sort_by, sort_order, page, per_page, include_relations)

    @classmethod
    def get_paginated_response(cls, query_result, include_relations=False, depth=1):
        """Optimiza serialización de listados precargando animal_count en 1 query."""
        if hasattr(query_result, "items"):
            instances = list(query_result.items)
        else:
            instances = list(query_result)

        try:
            from sqlalchemy import func
            from app.models.animalFields import AnimalFields
            from app.models.animals import Animals, AnimalStatus

            field_ids = [inst.id for inst in instances if getattr(inst, "id", None) is not None]
            counts = {}
            if field_ids:
                rows = (
                    db.session.query(AnimalFields.field_id, func.count(AnimalFields.id))
                    .join(Animals, AnimalFields.animal_id == Animals.id)
                    .filter(
                        AnimalFields.field_id.in_(field_ids),
                        AnimalFields.removal_date.is_(None),
                        AnimalFields.is_deleted == False,
                        Animals.is_deleted == False,
                        Animals.status == AnimalStatus.Vivo
                    )
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
                "total": query_result.total,
                "page": query_result.page,
                "per_page": query_result.per_page,
                "pages": query_result.pages,
                "has_next": query_result.has_next,
                "has_prev": query_result.has_prev,
                "total_items": query_result.total,
                "limit": query_result.per_page,
                "total_pages": query_result.pages,
                "has_next_page": query_result.has_next,
                "has_previous_page": query_result.has_prev,
            }

        return {
            "items": items,
            "total": len(items),
            "page": 1,
            "per_page": len(items),
            "pages": 1,
            "has_next": False,
            "has_prev": False,
            "total_items": len(items),
            "limit": len(items),
            "total_pages": 1,
            "has_next_page": False,
            "has_previous_page": False,
        }

    def __repr__(self):
        return f'<Field {self.id}: {self.name}>'
