from app import db
from app.models.base_model import BaseModel

class Treatments(BaseModel):
    """Modelo para tratamientos aplicados a animales optimizado para namespaces"""
    __tablename__ = 'treatments'
    # Índices de rendimiento para historial y consultas recientes
    __table_args__ = (
        db.Index('ix_treatments_animal_date', 'animal_id', 'treatment_date'),
        db.Index('ix_treatments_created_at', 'created_at'),
        db.Index('ix_treatments_finca_id', 'finca_id'),
    )
    
    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    treatment_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    frequency = db.Column(db.String(255), nullable=False)
    observations = db.Column(db.String(255), nullable=True)
    dosis = db.Column(db.String(255), nullable=False)
    withdrawal_days = db.Column(db.Integer, nullable=True, default=0)
    withdrawal_end_date = db.Column(db.Date, nullable=True)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=False)
    finca_id  = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=True)
    performed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Quién realizó el tratamiento
    cost = db.Column(db.Numeric(10, 2), nullable=True)                            # Costo del tratamiento (COP)

    # Configuración específica para namespaces
    _namespace_fields = [
        'id', 'treatment_date', 'description', 'frequency', 'observations', 'dosis',
        'withdrawal_days', 'withdrawal_end_date', 'animal_id', 'finca_id',
        'performed_by', 'cost', 'created_at', 'updated_at'
    ]
    _namespace_relations = {
        'animals': {'fields': ['id', 'record', 'sex', 'status'], 'depth': 1},
        'vaccines_treatments': {'fields': ['id', 'vaccine_id'], 'depth': 1},
        'medication_treatments': {'fields': ['id', 'medication_id'], 'depth': 1}
    }
    _searchable_fields = ['description', 'observations']
    _filterable_fields = ['animal_id', 'treatment_date', 'finca_id', 'created_at']
    _sortable_fields = ['id', 'treatment_date', 'created_at', 'updated_at']
    _required_fields = ['treatment_date', 'description', 'frequency', 'dosis', 'animal_id']
    _unique_fields = []
    _input_aliases = {
        'diagnosis': 'description',
        'end_date': 'observations' # Fallback or just ignore? Frontend uses end_date but backend doesn't have it.
    }

    # Relaciones optimizadas
    animals = db.relationship('Animals', back_populates='treatments', lazy='selectin')
    performer = db.relationship('User', foreign_keys=[performed_by], lazy='selectin')
    vaccines_treatments = db.relationship('TreatmentVaccines', back_populates='treatments', lazy='dynamic')
    medication_treatments = db.relationship('TreatmentMedications', back_populates='treatments', lazy='dynamic')
    
    @classmethod
    def create(cls, **kwargs):
        instance = super().create(**kwargs)
        if instance and instance.finca_id:
            from app.models.livestock_summary import LivestockSummary
            summary = LivestockSummary.get_for_finca(instance.finca_id)
            summary.recalculate()
        return instance

    def update(self, commit=True, **kwargs):
        updated_instance = super().update(commit=commit, **kwargs)
        if self.finca_id:
            from app.models.livestock_summary import LivestockSummary
            summary = LivestockSummary.get_for_finca(self.finca_id)
            summary.recalculate()
        return updated_instance

    def delete(self, commit=True):
        f_id = self.finca_id
        result = super().delete(commit=commit)
        if f_id:
            from app.models.livestock_summary import LivestockSummary
            summary = LivestockSummary.get_for_finca(f_id)
            summary.recalculate()
        return result

    def to_namespace_dict(self, include_relations: bool = False, depth: int = 1, fields=None):
        """Serializa el modelo a diccionario para namespace manteniendo compatibilidad con BaseModel"""
        return super().to_namespace_dict(include_relations=include_relations, depth=depth, fields=fields)
    
    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if 'description' in data and not data['description']:
            errors.append("La descripción no puede estar vacía")
        if 'dosis' in data and not data['dosis']:
            errors.append("La dosis no puede estar vacía")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError
            raise ValidationError('; '.join(errors), code="validation_error")

    def __repr__(self):
        return f'<Treatment {self.id}: {self.description[:30]}...>'
