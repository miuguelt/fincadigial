from app import db
import enum
import logging
from datetime import date
from app.models.base_model import BaseModel

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
    )

    id = db.Column(db.Integer, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)
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
        'id', 'animal_id', 'finca_id', 'date', 'liters', 'milking_session', 
        'fat_percentage', 'protein_percentage', 'somatic_cells', 'notes',
        'created_at', 'updated_at'
    ]
    _filterable_fields = ['animal_id', 'finca_id', 'date', 'milking_session']
    _sortable_fields = ['id', 'date', 'liters', 'created_at']
    _required_fields = ['animal_id', 'liters', 'milking_session']
    _enum_fields = {'milking_session': MilkSession}

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

    def __repr__(self):
        return f"<MilkProduction {self.id}: Animal {self.animal_id} - {self.liters}L ({self.milking_session})>"
