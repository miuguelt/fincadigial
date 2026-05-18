from app import db
import enum
from app.models.base_model import BaseModel

class OperationalCategory(enum.Enum):
    ALIMENTACION = 'Alimentación'
    SALUD = 'Salud'
    MANTENIMIENTO = 'Mantenimiento'
    PERSONAL = 'Personal'
    LEGAL = 'Legal'
    OTROS = 'Otros'

class OperationalCost(BaseModel):
    """Modelo para el registro de gastos operativos de la finca (P5)."""
    __tablename__ = 'operational_costs'
    
    id = db.Column(db.Integer, primary_key=True)
    concept = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(15, 2), nullable=False, default=0.00)
    date = db.Column(db.Date, nullable=False)
    category = db.Column(db.Enum(OperationalCategory), nullable=False, default=OperationalCategory.OTROS)
    notes = db.Column(db.Text, nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)

    _namespace_fields = ['id', 'concept', 'amount', 'date', 'category', 'notes', 'finca_id', 'created_at']
    _filterable_fields = ['category', 'date', 'finca_id']
    _searchable_fields = ['concept', 'notes']
    _sortable_fields = ['id', 'date', 'amount']
    _required_fields = ['concept', 'amount', 'date', 'category']
    _enum_fields = {'category': OperationalCategory}
