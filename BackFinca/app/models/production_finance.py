from app import db
from app.models.base_model import BaseModel
from datetime import date

# Compatibilidad legacy: la tabla canonical vive en milk_production.py.

class FarmExpenses(BaseModel):
    """Modelo simple de gastos e ingresos para el pequeño productor"""
    __tablename__ = 'farm_expenses'

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False, index=True)
    expense_date = db.Column(db.Date, nullable=False, default=date.today)
    category = db.Column(db.String(50), nullable=False) # Concentrado, Sal, Medicamento, Venta Leche, Venta Animal
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    is_income = db.Column(db.Boolean, default=False) # True = Ingreso, False = Gasto

    _namespace_fields = ['id', 'finca_id', 'expense_date', 'category', 'description', 'amount', 'is_income', 'created_at']
    _required_fields = ['finca_id', 'category', 'description', 'amount']
