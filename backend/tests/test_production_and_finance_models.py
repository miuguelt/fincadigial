"""Pruebas unitarias para modelos de producción y finanzas (animal_production_metrics, farm_expenses, financial_summary, milk_summary)."""

from datetime import date, timedelta
from decimal import Decimal
import pytest

from app.extensions import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.animal_production_metrics import AnimalProductionMetrics, MetricType
from app.models.base_model import ValidationError
from app.models.breeds import Breeds
from app.models.extended_summaries import FinancialSummary, MilkSummary
from app.models.financial import Transaction, TransactionCategory, TransactionType
from app.models.finca import FarmType, Finca
from app.models.milk_production import MilkProduction
from app.models.production_finance import FarmExpenses
from app.models.species import Species


@pytest.fixture
def base_farm_and_animal(app, db_session):
    """Crea una finca, especie, raza y animal para pruebas de modelos."""
    with app.app_context():
        finca = Finca.create(
            name="Hacienda El Modelo",
            type=FarmType.Tradicional,
            is_active=True,
        )
        species = Species.create(name="Bovino Modelo")
        breed = Breeds.create(name="Cebú Modelo", species_id=species.id)
        animal = Animals.create(
            record="MOD-001",
            sex=Sex.Hembra,
            weight=420.0,
            birth_date=date.today() - timedelta(days=800),
            breeds_id=breed.id,
            finca_id=finca.id,
            status=AnimalStatus.Vivo,
        )
        db_session.session.commit()
        return finca, animal


class TestAnimalProductionMetricsModel:
    """Valida reglas de negocio del modelo AnimalProductionMetrics."""

    def test_validation_rejects_future_date(self, base_farm_and_animal):
        finca, animal = base_farm_and_animal
        future_date = date.today() + timedelta(days=5)
        with pytest.raises(ValidationError, match="La fecha de registro no puede ser futura"):
            AnimalProductionMetrics.create(
                animal_id=animal.id,
                finca_id=finca.id,
                metric_type=MetricType.Weight,
                recorded_date=future_date,
                value=430.0,
                unit="kg",
            )

    def test_validation_rejects_negative_value(self, base_farm_and_animal):
        finca, animal = base_farm_and_animal
        with pytest.raises(ValidationError, match="no negativo"):
            AnimalProductionMetrics.create(
                animal_id=animal.id,
                finca_id=finca.id,
                metric_type=MetricType.Weight,
                recorded_date=date.today(),
                value=-15.5,
                unit="kg",
            )

    def test_create_and_trend_and_average(self, base_farm_and_animal):
        finca, animal = base_farm_and_animal
        today = date.today()
        m1 = AnimalProductionMetrics.create(
            animal_id=animal.id,
            finca_id=finca.id,
            metric_type=MetricType.Weight,
            recorded_date=today - timedelta(days=20),
            value=410.0,
            unit="kg",
        )
        m2 = AnimalProductionMetrics.create(
            animal_id=animal.id,
            finca_id=finca.id,
            metric_type=MetricType.Weight,
            recorded_date=today - timedelta(days=5),
            value=425.0,
            unit="kg",
        )
        assert m1.id is not None
        assert f"{m2.value}" in repr(m2)

        trend = AnimalProductionMetrics.get_trend(animal.id, MetricType.Weight, days=30)
        assert len(trend) == 2
        assert [r.value for r in trend] == [410.0, 425.0]

        avg_val = AnimalProductionMetrics.get_average(finca.id, MetricType.Weight, days=30)
        assert avg_val == 417.5


class TestFarmExpensesModel:
    """Valida el modelo simple de gastos e ingresos rurales FarmExpenses."""

    def test_create_expense_and_income(self, base_farm_and_animal):
        finca, _ = base_farm_and_animal
        expense = FarmExpenses.create(
            finca_id=finca.id,
            expense_date=date.today(),
            category="Alimento",
            description="Bulto de concentrado lechero 40kg",
            amount=115000.0,
            is_income=False,
        )
        assert expense.id is not None
        assert expense.is_income is False
        assert expense.amount == 115000.0

        income = FarmExpenses.create(
            finca_id=finca.id,
            expense_date=date.today(),
            category="Venta Leche",
            description="Pago quincenal recolección de leche",
            amount=450000.0,
            is_income=True,
        )
        assert income.id is not None
        assert income.is_income is True


class TestFinancialSummaryModel:
    """Valida la tabla incremental financial_summary."""

    def test_get_for_finca_creates_singleton(self, base_farm_and_animal):
        finca, _ = base_farm_and_animal
        s1 = FinancialSummary.get_for_finca(finca.id)
        s2 = FinancialSummary.get_for_finca(finca.id)
        assert s1.id == s2.id
        assert s1.balance == Decimal("0.00")

    def test_apply_transaction_and_reversion(self, base_farm_and_animal):
        finca, _ = base_farm_and_animal
        summary = FinancialSummary.get_for_finca(finca.id)

        # Ingreso de 500,000 COP
        summary.apply_transaction(TransactionType.Income, 500000.0)
        assert summary.total_income == Decimal("500000.00")
        assert summary.balance == Decimal("500000.00")

        # Gasto de 150,000 COP
        summary.apply_transaction(TransactionType.Expense, 150000.0)
        assert summary.total_expense == Decimal("150000.00")
        assert summary.balance == Decimal("350000.00")

        # Reversión del gasto
        summary.apply_transaction(TransactionType.Expense, 150000.0, is_reversion=True)
        assert summary.total_expense == Decimal("0.00")
        assert summary.balance == Decimal("500000.00")

    def test_recalculate_from_transactions(self, base_farm_and_animal):
        finca, animal = base_farm_and_animal
        summary = FinancialSummary.get_for_finca(finca.id)
        summary.total_income = Decimal("0.00")
        summary.total_expense = Decimal("0.00")
        summary.balance = Decimal("0.00")
        db.session.commit()

        # Crear transacciones reales
        Transaction.create(
            finca_id=finca.id,
            animal_id=animal.id,
            transaction_type=TransactionType.Income,
            category=TransactionCategory.Animal,
            amount=800000.0,
            date=date.today(),
            description="Venta novillo",
        )
        summary.recalculate()
        assert summary.total_income == Decimal("800000.00")
        assert summary.balance == Decimal("800000.00")


class TestMilkSummaryModel:
    """Valida la tabla incremental milk_summary."""

    def test_apply_production_and_reversion(self, base_farm_and_animal):
        finca, _ = base_farm_and_animal
        summary = MilkSummary.get_for_finca(finca.id)
        assert summary.total_liters == 0.0

        # Agregar producción de 25 litros
        summary.apply_production(25.0)
        assert summary.total_liters == 25.0
        assert summary.total_entries == 1
        assert summary.avg_liters_per_animal == 25.0

        # Agregar otro registro de 15 litros
        summary.apply_production(15.0)
        assert summary.total_liters == 40.0
        assert summary.total_entries == 2
        assert summary.avg_liters_per_animal == 20.0

        # Revertir el registro de 15 litros
        summary.apply_production(15.0, is_reversion=True)
        assert summary.total_liters == 25.0
        assert summary.total_entries == 1
        assert summary.avg_liters_per_animal == 25.0

        # Revertir el resto asegurando no negativos
        summary.apply_production(25.0, is_reversion=True)
        assert summary.total_liters == 0.0
        assert summary.total_entries == 0
        assert summary.avg_liters_per_animal == 0.0


class TestOperationalCostModel:
    """Valida la tabla operational_costs y categorías de gastos."""

    def test_create_and_category_enum(self, base_farm_and_animal):
        finca, _ = base_farm_and_animal
        from app.models.operational_costs import OperationalCategory, OperationalCost

        cost = OperationalCost.create(
            finca_id=finca.id,
            concept="Mantenimiento cerca perimetral",
            amount=250000.0,
            date=date.today(),
            category=OperationalCategory.MANTENIMIENTO,
            notes="Postes y alambre de púas",
        )
        assert cost.id is not None
        assert cost.category == OperationalCategory.MANTENIMIENTO
        assert cost.amount == 250000.0
        assert cost.finca_id == finca.id
