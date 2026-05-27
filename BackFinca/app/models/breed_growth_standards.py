from app import db
import enum
from app.models.base_model import BaseModel, ValidationError


class GrowthStage(enum.Enum):
    """Etapas de crecimiento para ganado bovino"""
    Neonato = 'Neonato'       # 0-1 mes
    Lactancia = 'Lactancia'   # 1-6 meses
    Destete = 'Destete'       # 6-12 meses
    Desarrollo = 'Desarrollo' # 12-24 meses
    Adulto = 'Adulto'         # 24+ meses


class BreedGrowthStandard(BaseModel):
    """Curvas de crecimiento esperadas por raza, sexo y propósito.
    
    Permite comparar el crecimiento real de un animal contra estándares
    específicos de su raza en lugar de una curva genérica.
    """
    __tablename__ = 'breed_growth_standards'
    __table_args__ = (
        db.Index('ix_bgs_breed_sex_stage', 'breed_id', 'sex', 'growth_stage'),
        db.Index('ix_bgs_age_months', 'age_months'),
        db.UniqueConstraint('breed_id', 'sex', 'growth_stage', 'age_months',
                           name='uq_breed_growth_standard'),
    )

    id = db.Column(db.Integer, primary_key=True)
    breed_id = db.Column(db.Integer, db.ForeignKey('breeds.id'), nullable=False)
    sex = db.Column(db.String(20), nullable=False)  # 'Hembra' o 'Macho'
    growth_stage = db.Column(db.Enum(GrowthStage), nullable=False)
    age_months = db.Column(db.Integer, nullable=False)  # Punto de referencia en meses
    expected_weight_kg = db.Column(db.Float, nullable=False)
    min_weight_kg = db.Column(db.Float, nullable=False)  # Umbral inferior de alerta
    max_weight_kg = db.Column(db.Float, nullable=True)  # Umbral superior (opcional)
    expected_adg_kg = db.Column(db.Float, nullable=False)  # Ganancia diaria esperada (kg/día)
    min_adg_kg = db.Column(db.Float, nullable=False)  # ADG mínimo aceptable

    # Relaciones
    breed = db.relationship('Breeds', backref='growth_standards', lazy='selectin')

    _namespace_fields = [
        'id', 'breed_id', 'sex', 'growth_stage', 'age_months',
        'expected_weight_kg', 'min_weight_kg', 'max_weight_kg',
        'expected_adg_kg', 'min_adg_kg', 'created_at', 'updated_at'
    ]
    _namespace_relations = {
        'breed': {'fields': ['id', 'name', 'purpose'], 'depth': 1},
    }
    _filterable_fields = ['breed_id', 'sex', 'growth_stage', 'age_months']
    _sortable_fields = ['id', 'age_months', 'expected_weight_kg', 'expected_adg_kg']
    _required_fields = ['breed_id', 'sex', 'growth_stage', 'age_months',
                       'expected_weight_kg', 'min_weight_kg', 'expected_adg_kg', 'min_adg_kg']
    _enum_fields = {'growth_stage': GrowthStage}

    @classmethod
    def get_expected_weight(cls, breed_id, sex, age_months):
        """Obtiene el peso esperado para un animal dado su raza, sexo y edad.
        Usa interpolación lineal entre puntos de referencia."""
        standards = cls.query.filter_by(
            breed_id=breed_id, sex=sex
        ).order_by(cls.age_months).all()

        if not standards:
            return None, None, None

        # Encontrar los puntos de referencia más cercanos
        lower = None
        upper = None
        for s in standards:
            if s.age_months <= age_months:
                lower = s
            if s.age_months >= age_months and upper is None:
                upper = s

        if lower is None:
            lower = standards[0]
        if upper is None:
            upper = standards[-1]

        if lower.age_months == upper.age_months:
            return lower.expected_weight_kg, lower.min_weight_kg, lower.expected_adg_kg

        # Interpolación lineal
        t = (age_months - lower.age_months) / (upper.age_months - lower.age_months)
        expected = lower.expected_weight_kg + t * (upper.expected_weight_kg - lower.expected_weight_kg)
        min_w = lower.min_weight_kg + t * (upper.min_weight_kg - lower.min_weight_kg)
        adg = lower.expected_adg_kg + t * (upper.expected_adg_kg - lower.expected_adg_kg)

        return round(expected, 1), round(min_w, 1), round(adg, 3)

    @classmethod
    def get_adg_by_stage(cls, breed_id, sex, growth_stage):
        """Obtiene el ADG esperado para una etapa de crecimiento específica."""
        standard = cls.query.filter_by(
            breed_id=breed_id, sex=sex, growth_stage=growth_stage
        ).first()
        if standard:
            return standard.expected_adg_kg, standard.min_adg_kg
        return None, None

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        if 'expected_weight_kg' in data and data['expected_weight_kg'] <= 0:
            raise ValidationError("El peso esperado debe ser positivo")
        if 'min_weight_kg' in data and data['min_weight_kg'] <= 0:
            raise ValidationError("El peso mínimo debe ser positivo")
        if 'expected_adg_kg' in data and data['expected_adg_kg'] <= 0:
            raise ValidationError("El ADG esperado debe ser positivo")
        if 'min_adg_kg' in data and data['min_adg_kg'] <= 0:
            raise ValidationError("El ADG mínimo debe ser positivo")
        return super()._validate_and_normalize(data, is_update, instance_id)

    def __repr__(self):
        return f'<BreedGrowthStandard breed={self.breed_id} {self.sex} {self.age_months}m: {self.expected_weight_kg}kg>'
