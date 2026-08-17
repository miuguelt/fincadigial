"""Shared filters for financial records used in operational reports."""

from sqlalchemy import or_


def exclude_simulated_transactions(query, model):
    """Exclude marked and legacy seed-script rows while keeping real records."""
    simulation_descriptions = or_(
        model.description.ilike("[Simulado]%"),
        model.description.ilike("Transacción automática de %"),
    )
    return query.filter(
        or_(
            model.description.is_(None),
            ~simulation_descriptions,
        )
    )
