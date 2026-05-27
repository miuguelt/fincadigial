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

    def update(self, commit=True, **kwargs):
        """Sobreescribe update para sincronizar el resumen cuando cambian los montos o tipos."""
        old_amount = self.amount
        old_type = self.transaction_type
        old_finca = self.finca_id

        result = super().update(commit=False, **kwargs)

        if old_finca and (old_amount != self.amount or old_type != self.transaction_type or old_finca != self.finca_id):
            from app.models.extended_summaries import FinancialSummary
            
            # Revertir de la finca anterior
            old_summary = FinancialSummary.get_for_finca(old_finca)
            old_summary.apply_transaction(old_type, old_amount, is_reversion=True)
            
            # Aplicar a la finca actual
            new_summary = FinancialSummary.get_for_finca(self.finca_id)
            new_summary.apply_transaction(self.transaction_type, self.amount)

        if commit:
            db.session.commit()
        return result

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

    def restore(self, commit=True):
        """Sobreescribe restore para disparar la actualización incremental al restaurar."""
        result = super().restore(commit=commit)
        if self.finca_id:
            from app.models.extended_summaries import FinancialSummary
            summary = FinancialSummary.get_for_finca(self.finca_id)
            summary.apply_transaction(self.transaction_type, self.amount)
            if commit:
                db.session.commit()
        return result

    @classmethod
    def bulk_create(cls, items_data):
        instances = super().bulk_create(items_data)
        finca_ids = {inst.finca_id for inst in instances if inst.finca_id}
        if finca_ids:
            from app.models.extended_summaries import FinancialSummary
            for f_id in finca_ids:
                summary = FinancialSummary.get_for_finca(f_id)
                summary.recalculate()
        return instances

    @classmethod
    def bulk_update(cls, updates_data):
        instances = super().bulk_update(updates_data)
        finca_ids = {inst.finca_id for inst in instances if inst.finca_id}
        if finca_ids:
            from app.models.extended_summaries import FinancialSummary
            for f_id in finca_ids:
                summary = FinancialSummary.get_for_finca(f_id)
                summary.recalculate()
        return instances

    @classmethod
    def bulk_delete(cls, ids, hard_delete=False):
        from app.utils.tenant_context import apply_tenant_filter
        instances = apply_tenant_filter(cls.query, cls).filter(cls.id.in_(ids)).all()
        finca_ids = {inst.finca_id for inst in instances if inst.finca_id}
        
        count = super().bulk_delete(ids, hard_delete=hard_delete)
        
        if finca_ids:
            from app.models.extended_summaries import FinancialSummary
            for f_id in finca_ids:
                summary = FinancialSummary.get_for_finca(f_id)
                summary.recalculate()
        return count
