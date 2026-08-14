"""Per-farm KPI aggregation.

Single source of truth for the numbers shown in the multi-farm panoramic view
(`/multi-finca/compare-kpis`) and in the PDF reports built from the same page.
Before this module each caller rebuilt the aggregation by hand, which is how
the soft-delete filter ended up missing in some of them and present in others.

Every aggregate here:
  - excludes soft-deleted rows (`is_deleted`), like the rest of the API does,
  - runs one grouped query per metric instead of one query per farm,
  - keeps money in Decimal until the very last step, so the net balance is not
    the result of subtracting two floats.
"""

from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import case, func

from app.extensions import db

_CENTS = Decimal('0.01')


def _money(value) -> float:
    """Round a Decimal amount to cents before handing it to JSON."""
    if value is None:
        return 0.0
    return float(Decimal(value).quantize(_CENTS, rounding=ROUND_HALF_UP))


def get_fincas_kpis(finca_ids: list[int]) -> dict[int, dict]:
    """Return {finca_id: kpis} for the given farms.

    Farms without movements still get an entry with every key set to zero, so
    callers never have to guard against missing keys.
    """
    from app.models.animals import Animals, AnimalStatus, Sex
    from app.models.fields import Fields, parse_numeric_text
    from app.models.financial import Transaction, TransactionType
    from app.models.milk_production import MilkProduction

    finca_ids = [int(f_id) for f_id in finca_ids]
    kpis = {
        f_id: {
            'total_animals': 0,
            'total_animals_males': 0,
            'total_animals_females': 0,
            'total_milk_liters': 0.0,
            'total_income': 0.0,
            'total_expenses': 0.0,
            'net_balance': 0.0,
            'total_fields': 0,
            'total_fields_area': 0.0,
        }
        for f_id in finca_ids
    }
    if not finca_ids:
        return kpis

    # ---- Live animals, split by sex -----------------------------------------
    animal_rows = (
        db.session.query(
            Animals.finca_id,
            func.count(Animals.id),
            func.sum(case((Animals.sex == Sex.Macho, 1), else_=0)),
            func.sum(case((Animals.sex == Sex.Hembra, 1), else_=0)),
        )
        .filter(
            Animals.finca_id.in_(finca_ids),
            Animals.status == AnimalStatus.Vivo,
            Animals.is_deleted.is_(False),
        )
        .group_by(Animals.finca_id)
        .all()
    )
    for finca_id, total, males, females in animal_rows:
        kpis[finca_id]['total_animals'] = int(total or 0)
        kpis[finca_id]['total_animals_males'] = int(males or 0)
        kpis[finca_id]['total_animals_females'] = int(females or 0)

    # ---- Milk produced (historic total) -------------------------------------
    milk_rows = (
        db.session.query(MilkProduction.finca_id, func.sum(MilkProduction.liters))
        .filter(
            MilkProduction.finca_id.in_(finca_ids),
            MilkProduction.is_deleted.is_(False),
        )
        .group_by(MilkProduction.finca_id)
        .all()
    )
    for finca_id, liters in milk_rows:
        kpis[finca_id]['total_milk_liters'] = float(liters or 0.0)

    # ---- Income / expenses --------------------------------------------------
    money_rows = (
        db.session.query(
            Transaction.finca_id,
            Transaction.transaction_type,
            func.sum(Transaction.amount),
        )
        .filter(
            Transaction.finca_id.in_(finca_ids),
            Transaction.is_deleted.is_(False),
        )
        .group_by(Transaction.finca_id, Transaction.transaction_type)
        .all()
    )
    totals = {f_id: {'income': Decimal(0), 'expenses': Decimal(0)} for f_id in finca_ids}
    for finca_id, tx_type, amount in money_rows:
        key = 'income' if tx_type == TransactionType.Income else 'expenses'
        totals[finca_id][key] = Decimal(amount or 0)

    for finca_id, amounts in totals.items():
        kpis[finca_id]['total_income'] = _money(amounts['income'])
        kpis[finca_id]['total_expenses'] = _money(amounts['expenses'])
        kpis[finca_id]['net_balance'] = _money(amounts['income'] - amounts['expenses'])

    # ---- Paddocks and area --------------------------------------------------
    # `area` is a free-text column ("85 hectáreas"), so it cannot be summed in
    # SQL; only the column is loaded and parsed here, never whole rows.
    field_rows = (
        db.session.query(Fields.finca_id, Fields.area)
        .filter(Fields.finca_id.in_(finca_ids), Fields.is_deleted.is_(False))
        .all()
    )
    for finca_id, area in field_rows:
        kpis[finca_id]['total_fields'] += 1
        kpis[finca_id]['total_fields_area'] += parse_numeric_text(area)

    for entry in kpis.values():
        entry['total_fields_area'] = round(entry['total_fields_area'], 2)

    return kpis


def get_user_fincas_report(user_id: int) -> list[dict]:
    """Farms the user can access, each with its KPIs.

    Soft-deleted farms are left out: a deleted farm must not keep adding its
    animals and its balance to the consolidated totals.
    """
    from app.models.finca import Finca
    from app.models.user_finca import UserFinca

    memberships = (
        db.session.query(UserFinca, Finca)
        .join(Finca, Finca.id == UserFinca.finca_id)
        .filter(
            UserFinca.user_id == int(user_id),
            UserFinca.is_active.is_(True),
            Finca.is_deleted.is_(False),
        )
        .order_by(Finca.name)
        .all()
    )

    kpis = get_fincas_kpis([finca.id for _, finca in memberships])

    return [
        {
            'finca_id': finca.id,
            'finca_name': finca.name,
            'finca_type': finca.type.value if finca.type else None,
            'finca_is_active': bool(finca.is_active),
            'department': finca.department or '',
            'municipality': finca.municipality or '',
            'role': membership.role,
            'kpis': kpis[finca.id],
        }
        for membership, finca in memberships
    ]
