"""Herd headline figures, unread alerts and profitability per litre."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func

from app import db

from .numbers import as_float

# Cuántas alertas sin leer se muestran de cada tipo antes de mandar a la lista completa.
_ALERTS_PREVIEW = 10


def get_basic_stats(finca_id=None) -> dict:
    """Cifras de cabecera del ganado."""
    from app.models.animals import AnimalStatus, Animals
    from app.models.control import Control
    from app.models.livestock_summary import LivestockSummary
    from app.models.treatments import Treatments
    from app.utils.tenant_context import get_current_finca_id

    if finca_id is None:
        finca_id = get_current_finca_id()

    summary = LivestockSummary.get_for_finca(finca_id)

    # `LivestockSummary` ya descuenta los borrados; estas consultas van directas
    # a las tablas y deben hacer lo mismo para no contradecirlo.
    avg_weight = (
        db.session.query(func.avg(Animals.weight))
        .filter_by(finca_id=finca_id, status=AnimalStatus.Vivo, is_deleted=False)
        .scalar()
        or 0
    )

    health_rows = (
        db.session.query(Control.health_status, func.count(Control.id))
        .filter_by(finca_id=finca_id, is_deleted=False)
        .group_by(Control.health_status)
        .all()
    )

    treatments = (
        db.session.query(func.count(Treatments.id))
        .filter_by(finca_id=finca_id, is_deleted=False)
        .scalar()
        or 0
    )

    return {
        "total_animals": summary.total_animals,
        "active_animals": summary.active_animals,
        "sick_animals": summary.sick_animals,
        "average_weight": round(as_float(avg_weight), 2),
        "total_treatments": treatments,
        "health_summary": {
            (status.value if hasattr(status, "value") else str(status)): count
            for status, count in health_rows
        },
        "last_summary_update": (
            summary.last_recalculation.isoformat()
            if summary.last_recalculation
            else None
        ),
    }


def get_alerts_summary(finca_id) -> dict:
    """Alertas sin leer, separadas entre las de un animal y las de la finca."""
    from app.models.alerts import AlertPriority, AnimalAlert

    def unread(**extra):
        return AnimalAlert.query.filter_by(
            finca_id=finca_id, is_read=False, superseded_by_id=None, **extra
        )

    animal_alerts = (
        unread()
        .filter(AnimalAlert.animal_id.isnot(None))
        .order_by(AnimalAlert.triggered_at.desc())
        .limit(_ALERTS_PREVIEW)
        .all()
    )
    finca_alerts = (
        unread()
        .filter(AnimalAlert.animal_id.is_(None))
        .order_by(AnimalAlert.triggered_at.desc())
        .limit(_ALERTS_PREVIEW)
        .all()
    )

    return {
        "animal_alerts": [alert.to_namespace_dict() for alert in animal_alerts],
        "finca_alerts": [alert.to_namespace_dict() for alert in finca_alerts],
        "counts": {
            "critical": unread(priority=AlertPriority.CRITICAL).count(),
            "high": unread(priority=AlertPriority.HIGH).count(),
        },
    }


def get_profitability_insights(finca_id) -> dict:
    """Ingreso, costo y margen por litro de leche."""
    from app.models.financial import Transaction, TransactionCategory, TransactionType
    from app.models.milk_production import MilkProduction
    from app.utils.financial_filters import exclude_simulated_transactions

    def money(transaction_type, categories):
        query = db.session.query(func.sum(Transaction.amount)).filter(
            Transaction.finca_id == finca_id,
            Transaction.transaction_type == transaction_type,
            Transaction.category.in_(categories),
            Transaction.is_deleted.is_(False),
        )
        return as_float(exclude_simulated_transactions(query, Transaction).scalar())

    milk_income = money(TransactionType.Income, [TransactionCategory.Milk])
    input_costs = money(
        TransactionType.Expense,
        [TransactionCategory.Medication, TransactionCategory.Food],
    )

    liters = as_float(
        db.session.query(func.sum(MilkProduction.liters))
        .filter(
            MilkProduction.finca_id == finca_id,
            MilkProduction.is_deleted.is_(False),
        )
        .scalar()
    )
    # Sin ordeños registrados se divide por uno: el resultado es el total, no un error.
    liters = liters or 1.0

    return {
        "income_per_liter": round(milk_income / liters, 2),
        "cost_per_liter": round(input_costs / liters, 2),
        "margin_per_liter": round((milk_income - input_costs) / liters, 2),
        "efficiency_ratio": round(milk_income / (input_costs or 1), 2),
    }


def recent_additions(finca_id, days=30) -> int:
    """Animales registrados en la ventana reciente, para la tasa de crecimiento."""
    from app.models.animals import Animals

    since = datetime.now(UTC) - timedelta(days=days)
    return (
        db.session.query(func.count(Animals.id))
        .filter(
            Animals.finca_id == finca_id,
            Animals.created_at >= since,
        )
        .scalar()
        or 0
    )
