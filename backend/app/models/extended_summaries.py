from app import db
from app.models.base_model import BaseModel
from datetime import datetime, UTC
from decimal import Decimal


def _as_decimal(value) -> Decimal:
    """Normaliza a Decimal los acumuladores Numeric.

    Los defaults de columna son floats de Python y los importes entran como
    float desde el payload JSON, así que sumarlos contra el Decimal que
    devuelve la base de datos lanzaba
    TypeError: unsupported operand type(s) for +=: 'float' and 'decimal.Decimal'.
    """
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value or 0))


class FinancialSummary(BaseModel):
    """Resumen incremental para finanzas."""

    __tablename__ = "financial_summary"

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id"), unique=True, nullable=False
    )

    total_income = db.Column(db.Numeric(15, 2), default=0.00)
    total_expense = db.Column(db.Numeric(15, 2), default=0.00)
    balance = db.Column(db.Numeric(15, 2), default=0.00)

    last_update = db.Column(db.DateTime, default=lambda: datetime.now(UTC))

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
        from app.utils.financial_filters import exclude_simulated_transactions

        income_query = db.session.query(db.func.sum(Transaction.amount)).filter_by(
            finca_id=self.finca_id,
            transaction_type=TransactionType.Income,
            is_deleted=False,
        )
        expense_query = db.session.query(db.func.sum(Transaction.amount)).filter_by(
            finca_id=self.finca_id,
            transaction_type=TransactionType.Expense,
            is_deleted=False,
        )
        incomes = (
            exclude_simulated_transactions(income_query, Transaction).scalar() or 0
        )
        expenses = (
            exclude_simulated_transactions(expense_query, Transaction).scalar() or 0
        )

        self.total_income = _as_decimal(incomes)
        self.total_expense = _as_decimal(expenses)
        self.balance = self.total_income - self.total_expense
        self.last_update = datetime.now(UTC)
        db.session.commit()

    def apply_transaction(self, tx_type, amount, is_reversion=False):
        """Aplica un cambio incremental a las finanzas."""
        from app.models.financial import TransactionType

        delta = _as_decimal(amount)
        if is_reversion:
            delta = -delta

        if tx_type == TransactionType.Income:
            self.total_income = _as_decimal(self.total_income) + delta
        else:
            self.total_expense = _as_decimal(self.total_expense) + delta

        self.balance = _as_decimal(self.total_income) - _as_decimal(self.total_expense)
        self.last_update = datetime.now(UTC)


class MilkSummary(BaseModel):
    """Resumen incremental para producción láctea."""

    __tablename__ = "milk_summary"

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id"), unique=True, nullable=False
    )

    total_liters = db.Column(db.Float, default=0.0)
    avg_liters_per_animal = db.Column(db.Float, default=0.0)
    total_entries = db.Column(db.Integer, default=0)

    last_update = db.Column(db.DateTime, default=lambda: datetime.now(UTC))

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
        from app.models.animals import Animals

        stats = (
            db.session.query(
                db.func.sum(MilkProduction.liters),
                db.func.count(MilkProduction.id),
                db.func.avg(MilkProduction.liters),
            )
            .join(Animals, Animals.id == MilkProduction.animal_id)
            .filter(
                MilkProduction.finca_id == self.finca_id,
                MilkProduction.is_deleted == False,
                Animals.is_deleted == False,
            )
            .first()
        )

        self.total_liters = stats[0] or 0.0
        self.total_entries = stats[1] or 0
        self.avg_liters_per_animal = float(stats[2]) if stats[2] else 0.0
        self.last_update = datetime.now(UTC)
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

        self.last_update = datetime.now(UTC)
