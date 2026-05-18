from app import db
from app.models.base_model import BaseModel
from datetime import datetime, timezone

class FinancialSummary(BaseModel):
    """Resumen incremental para finanzas."""
    __tablename__ = "financial_summary"
    
    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), unique=True, nullable=False)
    
    total_income = db.Column(db.Numeric(15, 2), default=0.00)
    total_expense = db.Column(db.Numeric(15, 2), default=0.00)
    balance = db.Column(db.Numeric(15, 2), default=0.00)
    
    last_update = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    @classmethod
    def get_for_finca(cls, finca_id):
        summary = cls.query.filter_by(finca_id=finca_id).first()
        if not summary:
            summary = cls(finca_id=finca_id)
            db.session.add(summary)
            db.session.commit()
        return summary

    def recalculate(self):
        """Recalcula desde cero basado en transacciones reales."""
        from app.models.financial import Transaction, TransactionType
        incomes = db.session.query(db.func.sum(Transaction.amount)).filter_by(
            finca_id=self.finca_id, transaction_type=TransactionType.Income).scalar() or 0
        expenses = db.session.query(db.func.sum(Transaction.amount)).filter_by(
            finca_id=self.finca_id, transaction_type=TransactionType.Expense).scalar() or 0
        
        self.total_income = incomes
        self.total_expense = expenses
        self.balance = self.total_income - self.total_expense
        self.last_update = datetime.now(timezone.utc)
        db.session.commit()

    def apply_transaction(self, tx_type, amount, is_reversion=False):
        """Aplica un cambio incremental a las finanzas."""
        from app.models.financial import TransactionType
        delta = -amount if is_reversion else amount
        
        if tx_type == TransactionType.Income:
            self.total_income += delta
        else:
            self.total_expense += delta
            
        self.balance = self.total_income - self.total_expense
        self.last_update = datetime.now(timezone.utc)

class MilkSummary(BaseModel):
    """Resumen incremental para producción láctea."""
    __tablename__ = "milk_summary"
    
    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), unique=True, nullable=False)
    
    total_liters = db.Column(db.Float, default=0.0)
    avg_liters_per_animal = db.Column(db.Float, default=0.0)
    total_entries = db.Column(db.Integer, default=0)
    
    last_update = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    @classmethod
    def get_for_finca(cls, finca_id):
        summary = cls.query.filter_by(finca_id=finca_id).first()
        if not summary:
            summary = cls(finca_id=finca_id)
            db.session.add(summary)
            db.session.commit()
        return summary

    def recalculate(self):
        """Recalcula desde cero basado en registros reales."""
        from app.models.milk_production import MilkProduction
        stats = db.session.query(
            db.func.sum(MilkProduction.liters),
            db.func.count(MilkProduction.id),
            db.func.avg(MilkProduction.liters)
        ).filter_by(finca_id=self.finca_id).first()
        
        self.total_liters = stats[0] or 0.0
        self.total_entries = stats[1] or 0
        self.avg_liters_per_animal = float(stats[2]) if stats[2] else 0.0
        self.last_update = datetime.now(timezone.utc)
        db.session.commit()

    def apply_production(self, liters, is_reversion=False):
        """Aplica un cambio incremental a la producción."""
        delta = -liters if is_reversion else liters
        count_delta = -1 if is_reversion else 1
        
        self.total_liters += delta
        self.total_entries += count_delta
        
        if self.total_entries > 0:
            self.avg_liters_per_animal = self.total_liters / self.total_entries
        else:
            self.avg_liters_per_animal = 0.0
            
        self.last_update = datetime.now(timezone.utc)
