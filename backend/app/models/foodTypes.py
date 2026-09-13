from app import db
from app.models.base_model import BaseModel, ValidationError


class FoodTypes(BaseModel):
    """Modelo para tipos de alimentos/cultivos optimizado para namespaces"""

    __tablename__ = "food_types"

    __table_args__ = (
        db.UniqueConstraint("food_type", "finca_id", name="uq_food_types_name_finca"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    food_type = db.Column(db.String(255), nullable=False)
    # NOTE: DB schema enforces NOT NULL for several columns; keep model aligned to avoid 409 IntegrityErrors.
    sowing_date = db.Column(db.Date, nullable=False)
    harvest_date = db.Column(db.Date, nullable=True)
    area = db.Column(db.Integer, nullable=False)
    handlings = db.Column(db.String(255), nullable=False)
    gauges = db.Column(db.String(255), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    # Configuración específica para namespaces
    _namespace_fields = [
        "id",
        "food_type",
        "sowing_date",
        "harvest_date",
        "area",
        "handlings",
        "gauges",
        "finca_id",
        "created_at",
    ]
    _namespace_relations = {"fields": {"fields": ["id", "name", "state"], "depth": 1}}
    _searchable_fields = ["food_type", "handlings"]
    _filterable_fields = [
        "sowing_date",
        "harvest_date",
        "area",
        "finca_id",
        "created_at",
    ]
    _sortable_fields = [
        "id",
        "food_type",
        "sowing_date",
        "harvest_date",
        "area",
        "created_at",
        "updated_at",
    ]
    # Required fields aligned with DB NOT NULL constraints
    _required_fields = ["food_type", "sowing_date", "area", "handlings", "gauges"]
    _unique_fields = []
    # Aliases to accept legacy/frontend field names (tests use 'name' and 'description')
    _input_aliases = {"name": "food_type", "description": "handlings"}

    # Relaciones optimizadas
    fields = db.relationship("Fields", back_populates="food_types", lazy="dynamic")

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        data = dict(data or {})
        if not is_update:
            from datetime import date

            if not data.get("sowing_date"):
                data["sowing_date"] = date.today().isoformat()
            if data.get("area") is None:
                data["area"] = 1
            if not data.get("handlings"):
                data["handlings"] = "Sin observaciones"
            if not data.get("gauges"):
                data["gauges"] = "Sin especificaciones"
        return super()._validate_and_normalize(
            data, is_update=is_update, instance_id=instance_id
        )

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if "food_type" in data and not str(data["food_type"]).strip():
            errors.append("El tipo de alimento no puede estar vacío")
        if "harvest_date" in data and (data["harvest_date"] == "" or data["harvest_date"] is None):
            data["harvest_date"] = None
        if "sowing_date" in data and not data["sowing_date"]:
            from datetime import date
            data["sowing_date"] = date.today()
        if "area" in data and data["area"] is not None:
            try:
                area_val = float(data["area"])
                if area_val <= 0:
                    errors.append("El área debe ser un número positivo")
                else:
                    data["area"] = int(round(area_val))
            except (ValueError, TypeError):
                errors.append("El área debe ser un número válido")
        if data.get("harvest_date") and data.get("sowing_date"):
            try:
                if data["harvest_date"] < data["sowing_date"]:
                    errors.append("La fecha de cosecha no puede ser anterior a la fecha de siembra")
            except TypeError:
                pass
        super()._validate_namespace_data(data)
        if errors:
            raise ValidationError("; ".join(errors), code="validation_error")

    def __repr__(self):
        return f"<FoodType {self.id}: {self.food_type}>"
