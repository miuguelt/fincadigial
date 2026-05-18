from app import db
from app.models.base_model import BaseModel
from sqlalchemy import Index
import enum as _enum

class TransactionType(_enum.Enum):
    Income = 'Ingreso'
    Expense = 'Gasto'

class TransactionCategory(_enum.Enum):
    Milk = 'Venta de Leche'
    Animal = 'Venta de Animal'
    Medication = 'Medicamentos'
    Food = 'Alimento'
    Service = 'Servicios Veterinarios'
    Other = 'Otros'

class Transaction(BaseModel):
    __tablename__ = 'transactions'
    __table_args__ = (
        Index('ix_transactions_finca_id', 'finca_id'),
        Index('ix_transactions_date', 'date'),
        Index('ix_transactions_animal_id', 'animal_id'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=True)
    
    transaction_type = db.Column(db.Enum(TransactionType), nullable=False)
    category = db.Column(db.Enum(TransactionCategory), nullable=False)
    
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255), nullable=True)
    
    # Relaciones
    animal = db.relationship('Animals', foreign_keys=[animal_id], lazy='selectin')
    
    _namespace_fields = [
        'id', 'finca_id', 'animal_id', 'transaction_type', 'category', 'amount', 'date', 'description'
    ]
    _namespace_relations = {
        'animal': {'fields': ['id', 'record', 'name']}
    }
    _filterable_fields = ['finca_id', 'animal_id', 'transaction_type', 'category', 'date']
    _searchable_fields = ['description']
    _sortable_fields = ['id', 'date', 'amount']
    _required_fields = ['finca_id', 'transaction_type', 'category', 'amount', 'date']
    _enum_fields = {
        'transaction_type': TransactionType,
        'category': TransactionCategory,
    }
    @classmethod
    def create(cls, **kwargs):
        instance = super().create(**kwargs)
        if instance and instance.finca_id:
            from app.models.extended_summaries import FinancialSummary
            summary = FinancialSummary.get_for_finca(instance.finca_id)
            summary.apply_transaction(instance.transaction_type, instance.amount)
            db.session.commit()
        return instance

    def delete(self, commit=True):
        f_id = self.finca_id
        tx_type = self.transaction_type
        amount = self.amount
        result = super().delete(commit=commit)
        if f_id:
            from app.models.extended_summaries import FinancialSummary
            summary = FinancialSummary.get_for_finca(f_id)
            summary.apply_transaction(tx_type, amount, is_reversion=True)
            if commit:
                db.session.commit()
        return result
