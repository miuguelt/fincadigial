from app import db
from app.models.base_model import BaseModel, ValidationError


class SeasonalAdjustment(BaseModel):
    """Factores de ajuste estacional por finca y mes.

    Permite ajustar las expectativas de crecimiento y producción
    según la estación del año (época seca vs lluvias).
    """

    __tablename__ = "seasonal_adjustments"
    __table_args__ = (
        db.UniqueConstraint("finca_id", "month", name="uq_seasonal_adj_finca_month"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    month = db.Column(db.Integer, nullable=False)  # 1-12
    adg_multiplier = db.Column(db.Float, nullable=False, default=1.0)
    # Factor multiplicador para ADG esperado (ej: 0.85 en época seca)
    pasture_quality_index = db.Column(db.Float, nullable=False, default=0.5)
    # Índice de calidad de pastura 0-1
    milk_production_multiplier = db.Column(db.Float, nullable=False, default=1.0)
    # Factor multiplicador para producción de leche
    heat_stress_risk = db.Column(db.String(20), nullable=False, default="bajo")
    # 'bajo', 'medio', 'alto', 'critico'
    description = db.Column(db.String(255), nullable=True)

    # Relaciones
    finca = db.relationship("Finca", backref="seasonal_adjustments", lazy="selectin")

    _namespace_fields = [
        "id",
        "finca_id",
        "month",
        "adg_multiplier",
        "pasture_quality_index",
        "milk_production_multiplier",
        "heat_stress_risk",
        "description",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "finca": {"fields": ["id", "name"], "depth": 1},
    }
    _filterable_fields = ["finca_id", "month", "heat_stress_risk"]
    _sortable_fields = ["id", "month", "adg_multiplier"]
    _required_fields = ["finca_id", "month", "adg_multiplier", "pasture_quality_index"]

    @classmethod
    def get_for_month(cls, finca_id, month):
        """Obtiene el ajuste estacional para un mes específico."""
        return cls.query.filter_by(finca_id=finca_id, month=month).first()

    @classmethod
    def get_current(cls, finca_id):
        """Obtiene el ajuste estacional para el mes actual."""
        from datetime import date

        return cls.get_for_month(finca_id, date.today().month)

    @classmethod
    def get_all_for_finca(cls, finca_id):
        """Obtiene todos los ajustes estacionales de una finca."""
        return cls.query.filter_by(finca_id=finca_id).order_by(cls.month).all()

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        if "month" in data:
            month = data["month"]
            if not isinstance(month, int) or month < 1 or month > 12:
                raise ValidationError("El mes debe estar entre 1 y 12")
        if "adg_multiplier" in data:
            mult = data["adg_multiplier"]
            if not isinstance(mult, (int, float)) or mult < 0.1 or mult > 2.0:
                raise ValidationError("El multiplicador ADG debe estar entre 0.1 y 2.0")
        if "pasture_quality_index" in data:
            pqi = data["pasture_quality_index"]
            if not isinstance(pqi, (int, float)) or pqi < 0 or pqi > 1:
                raise ValidationError(
                    "El índice de calidad de pastura debe estar entre 0 y 1"
                )
        if "heat_stress_risk" in data:
            valid_risks = ["bajo", "medio", "alto", "critico"]
            if data["heat_stress_risk"] not in valid_risks:
                raise ValidationError(
                    f"El riesgo de estrés calórico debe ser: {', '.join(valid_risks)}"
                )
        return super()._validate_and_normalize(data, is_update, instance_id)

    def __repr__(self):
        return f"<SeasonalAdjustment finca={self.finca_id} month={self.month} adg_mult={self.adg_multiplier}>"
