from app import db
import enum
import logging
from datetime import date
from app.models.base_model import BaseModel, ValidationError

logger = logging.getLogger(__name__)

class MilkSession(enum.Enum):
    """Enumeración para las sesiones de ordeño"""
    AM = 'AM'
    PM = 'PM'
    Extra = 'Extra'

    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]

    def __str__(self):
        return str(self.value)

class MilkProduction(BaseModel):
    """Modelo para registro de producción láctea - Multi-tenant"""
    __tablename__ = 'milk_production'

    __table_args__ = (
        db.Index('ix_milk_production_animal_id', 'animal_id'),
        db.Index('ix_milk_production_finca_id', 'finca_id'),
        db.Index('ix_milk_production_date', 'date'),
        db.UniqueConstraint('animal_id', 'date', 'milking_session', name='uq_milk_production_animal_date_session'),
    )

    id = db.Column(db.Integer, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)
    control_id = db.Column(db.Integer, db.ForeignKey('control.id'), nullable=True)
    date = db.Column(db.Date, nullable=False, default=date.today)
    liters = db.Column(db.Float, nullable=False)
    milking_session = db.Column(db.Enum(MilkSession), nullable=False, default=MilkSession.AM)

    # Calidad (opcional)
    fat_percentage = db.Column(db.Float, nullable=True)
    protein_percentage = db.Column(db.Float, nullable=True)
    somatic_cells = db.Column(db.Integer, nullable=True) # Células somáticas (indicador de mastitis)

    notes = db.Column(db.String(500), nullable=True)

    # Configuración para namespaces
    _namespace_fields = [
        'id', 'animal_id', 'finca_id', 'control_id', 'date', 'liters', 'milking_session',
        'fat_percentage', 'protein_percentage', 'somatic_cells', 'notes',
        'created_at', 'updated_at'
    ]
    _namespace_relations = {
        'control': {'fields': ['id', 'health_status']}
    }
    _filterable_fields = ['animal_id', 'finca_id', 'control_id', 'date', 'milking_session']
    _range_filter_fields = {'date_from': 'date', 'date_to': 'date'}
    _sortable_fields = ['id', 'date', 'liters', 'created_at']
    _required_fields = ['animal_id', 'liters', 'milking_session']
    _enum_fields = {'milking_session': MilkSession}
    _unique_fields = []

    control = db.relationship('Control', foreign_keys=[control_id], lazy='selectin')

    MIN_LITERS = 0.0
    MAX_LITERS = 80.0
    MAX_SOMATIC_CELLS = 1000000

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        """Validación adicional específica para producción de leche"""
        data = super()._validate_and_normalize(data, is_update=is_update, instance_id=instance_id)

        errors = []

        # Validar rango de litros
        if 'liters' in data:
            liters = data['liters']
            if liters < cls.MIN_LITERS or liters > cls.MAX_LITERS:
                errors.append(f"Litros debe estar entre {cls.MIN_LITERS} y {cls.MAX_LITERS}")

        # Validar células somáticas
        if 'somatic_cells' in data and data['somatic_cells'] is not None:
            if data['somatic_cells'] < 0 or data['somatic_cells'] > cls.MAX_SOMATIC_CELLS:
                errors.append(f"Células somáticas debe estar entre 0 y {cls.MAX_SOMATIC_CELLS}")

        # Validar porcentaje de grasa
        if 'fat_percentage' in data and data['fat_percentage'] is not None:
            if data['fat_percentage'] < 0 or data['fat_percentage'] > 100:
                errors.append("Porcentaje de grasa debe estar entre 0 y 100")

        # Validar porcentaje de proteína
        if 'protein_percentage' in data and data['protein_percentage'] is not None:
            if data['protein_percentage'] < 0 or data['protein_percentage'] > 100:
                errors.append("Porcentaje de proteína debe estar entre 0 y 100")

        if errors:
            raise ValidationError('; '.join(errors), code="validation_error", errors=errors)

        return data

    @classmethod
    def create(cls, **kwargs):
        """Sobreescribe create para disparar la actualización incremental de producción."""
        instance = super().create(**kwargs)
        if instance and instance.finca_id:
            from app.models.extended_summaries import MilkSummary
            summary = MilkSummary.get_for_finca(instance.finca_id)
            summary.apply_production(instance.liters)
            db.session.commit()
        return instance

    def update(self, commit=True, **kwargs):
        """Sobreescribe update para sincronizar el resumen cuando cambian los litros"""
        old_liters = self.liters
        result = super().update(commit=False, **kwargs)

        if self.finca_id and old_liters != self.liters:
            from app.models.extended_summaries import MilkSummary
            summary = MilkSummary.get_for_finca(self.finca_id)
            # Revertir el valor anterior y aplicar el nuevo
            summary.apply_production(old_liters, is_reversion=True)
            summary.apply_production(self.liters)

        if commit:
            db.session.commit()
        return result

    def delete(self, commit=True):
        """Sobreescribe para disparar la actualización incremental tras borrar un registro de leche."""
        f_id = self.finca_id
        liters = self.liters
        result = super().delete(commit=commit)
        if f_id:
            from app.models.extended_summaries import MilkSummary
            summary = MilkSummary.get_for_finca(f_id)
            summary.apply_production(liters, is_reversion=True)
            if commit:
                db.session.commit()
        return result

    def restore(self, commit=True):
        """Sobreescribe restore para disparar la actualización incremental al restaurar."""
        result = super().restore(commit=commit)
        if self.finca_id:
            from app.models.extended_summaries import MilkSummary
            summary = MilkSummary.get_for_finca(self.finca_id)
            summary.apply_production(self.liters)
            if commit:
                db.session.commit()
        return result

    @classmethod
    def bulk_create(cls, items_data):
        instances = super().bulk_create(items_data)
        finca_ids = {inst.finca_id for inst in instances if inst.finca_id}
        if finca_ids:
            from app.models.extended_summaries import MilkSummary
            for f_id in finca_ids:
                summary = MilkSummary.get_for_finca(f_id)
                summary.recalculate()
        return instances

    @classmethod
    def bulk_update(cls, updates_data):
        instances = super().bulk_update(updates_data)
        finca_ids = {inst.finca_id for inst in instances if inst.finca_id}
        if finca_ids:
            from app.models.extended_summaries import MilkSummary
            for f_id in finca_ids:
                summary = MilkSummary.get_for_finca(f_id)
                summary.recalculate()
        return instances

    @classmethod
    def bulk_delete(cls, ids, hard_delete=False):
        from app.utils.tenant_context import apply_tenant_filter
        instances = apply_tenant_filter(cls.query, cls).filter(cls.id.in_(ids)).all()
        finca_ids = {inst.finca_id for inst in instances if inst.finca_id}
        
        count = super().bulk_delete(ids, hard_delete=hard_delete)
        
        if finca_ids:
            from app.models.extended_summaries import MilkSummary
            for f_id in finca_ids:
                summary = MilkSummary.get_for_finca(f_id)
                summary.recalculate()
        return count

    def __repr__(self):
        return f"<MilkProduction {self.id}: Animal {self.animal_id} - {self.liters}L ({self.milking_session})>"
