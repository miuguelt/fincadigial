"""Query helpers for inventory lots.

Keeps SQL-level filtering/aggregation out of the namespace layer so the
namespace only orchestrates request -> service -> response.
"""

from datetime import date, timedelta
from typing import Optional

from sqlalchemy import and_, case, func, or_

from app import db
from app.models.inventory import InventoryLot, ProductType
from app.models.medications import Medications
from app.models.vaccines import Vaccines
from app.utils.tenant_context import apply_tenant_filter

# Status buckets exposed to the UI as a single `status` query param.
LOT_STATUSES = ("expired", "expiring_soon", "low_stock", "ok")

DEFAULT_EXPIRY_DAYS = 30


def _expired_clause(today: date):
    return InventoryLot.expiry_date < today


def _expiring_clause(today: date, days: int):
    return and_(
        InventoryLot.expiry_date >= today,
        InventoryLot.expiry_date <= today + timedelta(days=days),
    )


def _low_stock_clause(today: date):
    """Low stock only makes sense on lots that are still usable."""
    return and_(
        InventoryLot.min_stock.isnot(None),
        InventoryLot.current_quantity <= InventoryLot.min_stock,
        InventoryLot.expiry_date >= today,
    )


def _ok_clause(today: date, days: int):
    return and_(
        InventoryLot.expiry_date > today + timedelta(days=days),
        or_(
            InventoryLot.min_stock.is_(None),
            InventoryLot.current_quantity > InventoryLot.min_stock,
        ),
    )


def status_clause(
    status: str, today: Optional[date] = None, days: int = DEFAULT_EXPIRY_DAYS
):
    """Translate a UI status bucket into a SQL condition, or None if unknown."""
    today = today or date.today()
    if status == "expired":
        return _expired_clause(today)
    if status == "expiring_soon":
        return _expiring_clause(today, days)
    if status == "low_stock":
        return _low_stock_clause(today)
    if status == "ok":
        return _ok_clause(today, days)
    return None


def apply_product_search(query, search: str):
    """Search over lot fields *and* the linked product name.

    Uses outer joins because `medication_id`/`vaccine_id` are mutually
    exclusive and both nullable; an inner join would drop every row.
    """
    if not search:
        return query
    term = f"%{search}%"
    query = query.outerjoin(Medications, InventoryLot.medication_id == Medications.id)
    query = query.outerjoin(Vaccines, InventoryLot.vaccine_id == Vaccines.id)
    return query.filter(
        or_(
            InventoryLot.lot_number.ilike(term),
            InventoryLot.supplier.ilike(term),
            InventoryLot.notes.ilike(term),
            Medications.name.ilike(term),
            Vaccines.name.ilike(term),
        )
    )


def lot_counts(days: int = DEFAULT_EXPIRY_DAYS) -> dict:
    """All summary counters in a single aggregate query (no row hydration)."""
    today = date.today()
    base = apply_tenant_filter(db.session.query(InventoryLot), InventoryLot)
    if hasattr(InventoryLot, "is_deleted"):
        base = base.filter(InventoryLot.is_deleted == False)  # noqa: E712

    def _count(clause):
        return func.count(case((clause, 1)))

    row = base.with_entities(
        func.count(InventoryLot.id),
        _count(InventoryLot.product_type == ProductType.Medicamento),
        _count(InventoryLot.product_type == ProductType.Vacuna),
        _count(_expired_clause(today)),
        _count(_expiring_clause(today, days)),
        _count(_low_stock_clause(today)),
        func.coalesce(
            func.sum(
                InventoryLot.current_quantity * func.coalesce(InventoryLot.unit_cost, 0)
            ),
            0,
        ),
        func.coalesce(
            func.sum(
                case(
                    (
                        InventoryLot.expiry_date < today,
                        InventoryLot.current_quantity
                        * func.coalesce(InventoryLot.unit_cost, 0),
                    ),
                    else_=0,
                )
            ),
            0,
        ),
    ).one()

    return {
        "total_lots": int(row[0] or 0),
        "medication_lots": int(row[1] or 0),
        "vaccine_lots": int(row[2] or 0),
        "expired_lots": int(row[3] or 0),
        "expiring_soon_lots": int(row[4] or 0),
        "low_stock_lots": int(row[5] or 0),
        "total_estimated_value": round(float(row[6] or 0), 2),
        "expired_value": round(float(row[7] or 0), 2),
    }


def alert_lots(status: str, days: int = DEFAULT_EXPIRY_DAYS, limit: int = 5):
    """Top-N lots of a bucket, ordered by urgency. Never returns the whole table."""
    today = date.today()
    query = apply_tenant_filter(InventoryLot.query, InventoryLot)
    if hasattr(InventoryLot, "is_deleted"):
        query = query.filter(InventoryLot.is_deleted == False)  # noqa: E712

    clause = status_clause(status, today, days)
    if clause is None:
        return []
    query = query.filter(clause)

    if status == "low_stock":
        query = query.order_by(InventoryLot.current_quantity.asc())
    else:
        query = query.order_by(InventoryLot.expiry_date.asc())

    return query.limit(max(0, limit)).all()
