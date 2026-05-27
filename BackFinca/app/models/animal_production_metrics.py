from app import db
import enum
from datetime import date
from app.models.base_model import BaseModel, ValidationError


class MetricType(enum.Enum):
    Weight = 'Weight'
    MilkYield = 'MilkYield'
    GrowthRate = 'GrowthRate'
    FeedConversion = 'FeedConversion'
    BodyCondition = 'BodyCondition'


class AnimalProductionMetrics(BaseModel):
    """Métricas de producción por animal, desacopladas del modelo principal.
    
    Permite registrar y consultar tendencias de producción sin sobrecargar
    el modelo Animals. Escalable para analytics y reportes.
    """
    __tablename__ = 'animal_production_metrics'
    __table_args__ = (
        db.Index('ix_prod_metrics_animal_date', 'animal_id', 'recorded_date'),
        db.Index('ix_prod_metrics_type', 'metric_type'),
        db.Index('ix_prod_metrics_finca', 'finca_id'),
    )

    id = db.Column(db.Integer, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)
    metric_type = db.Column(db.Enum(MetricType), nullable=False)
    recorded_date = db.Column(db.Date, nullable=False)
    value = db.Column(db.Float, nullable=False)
    unit = db.Column(db.String(20), nullable=False, default='kg')
    notes = db.Column(db.Text, nullable=True)
    recorded_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    animal = db.relationship('Animals', back_populates='production_metrics', lazy='selectin')
    finca = db.relationship('Finca', backref='production_metrics_records', lazy='selectin')
    recorder = db.relationship('User', backref='metrics_recorded', lazy='selectin')

    _namespace_fields = [
        'id', 'animal_id', 'finca_id', 'metric_type', 'recorded_date',
        'value', 'unit', 'notes', 'recorded_by', 'created_at', 'updated_at'
    ]
    _namespace_relations = {
        'animal': {'fields': ['id', 'record', 'sex', 'status'], 'depth': 1},
    }
    _searchable_fields = ['notes']
    _filterable_fields = ['animal_id', 'metric_type', 'recorded_date', 'finca_id']
    _sortable_fields = ['id', 'recorded_date', 'value', 'created_at']
    _required_fields = ['animal_id', 'metric_type', 'recorded_date', 'value']
    _unique_fields = []
    _enum_fields = {'metric_type': MetricType}

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        if 'recorded_date' in data and data['recorded_date']:
            if data['recorded_date'] > date.today():
                raise ValidationError("La fecha de registro no puede ser futura")
        if 'value' in data:
            val = data['value']
            if not isinstance(val, (int, float)) or val < 0:
                raise ValidationError("'value' debe ser un número no negativo")
        return super()._validate_and_normalize(data, is_update, instance_id)

    @classmethod
    def get_trend(cls, animal_id, metric_type, days=90):
        """Obtiene la tendencia de una métrica específica en los últimos N días."""
        from datetime import timedelta
        cutoff = date.today() - timedelta(days=days)
        return cls.query.filter(
            cls.animal_id == animal_id,
            cls.metric_type == metric_type,
            cls.recorded_date >= cutoff
        ).order_by(cls.recorded_date).all()

    @classmethod
    def get_average(cls, finca_id, metric_type, days=30):
        """Calcula el promedio de una métrica para toda la finca."""
        from datetime import timedelta
        cutoff = date.today() - timedelta(days=days)
        from sqlalchemy import func
        result = db.session.query(func.avg(cls.value)).filter(
            cls.finca_id == finca_id,
            cls.metric_type == metric_type,
            cls.recorded_date >= cutoff
        ).scalar()
        return round(result, 2) if result else None

    def __repr__(self):
        return f'<ProdMetric {self.metric_type.value}={self.value}{self.unit} - Animal {self.animal_id}>'
