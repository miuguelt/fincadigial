"""Optional breakdowns of the custom report.

Each grouping needs the metric that feeds it: grouping animals by breed makes
no sense if the report did not ask for animals. Every builder here checks that
first and returns `None` when it has nothing to say.
"""

from sqlalchemy import func

from app import db

from .metric_sections import enum_value


def _by_breed(ctx, sections):
    animals = sections.get("animals")
    return dict(animals.breed_rows) if animals else None


def _by_species(ctx, sections):
    from app.models.animals import Animals
    from app.models.breeds import Breeds
    from app.models.species import Species

    if "animals" not in sections:
        return None

    rows = (
        db.session.query(Species.name, func.count(Animals.id))
        .join(Breeds, Breeds.species_id == Species.id)
        .join(Animals, Animals.breeds_id == Breeds.id)
        .filter(Species.is_deleted.is_(False), Breeds.is_deleted.is_(False))
    )
    return dict(ctx.scoped_animals(rows).group_by(Species.name).all())


def _by_field(ctx, sections):
    from app.models.animalFields import AnimalFields
    from app.models.animals import Animals
    from app.models.fields import Fields

    if "animals" not in sections:
        return None

    rows = (
        db.session.query(Fields.name, func.count(AnimalFields.animal_id))
        .join(AnimalFields, AnimalFields.field_id == Fields.id)
        .join(Animals, Animals.id == AnimalFields.animal_id)
        .filter(
            Fields.finca_id == ctx.finca_id,
            Fields.is_deleted.is_(False),
            AnimalFields.finca_id == ctx.finca_id,
            # Sólo los animales que siguen en el potrero.
            AnimalFields.removal_date.is_(None),
            AnimalFields.is_deleted.is_(False),
        )
    )
    return dict(ctx.scoped_animals(rows).group_by(Fields.name).all())


def _by_health_status(ctx, sections):
    from app.models.control import Control

    if not {"health", "production"}.intersection(sections):
        return None

    rows = (
        db.session.query(Control.health_status, func.count(Control.id))
        .filter(
            Control.finca_id == ctx.finca_id,
            Control.checkup_date >= ctx.spec.start_date,
            Control.checkup_date <= ctx.spec.end_date,
            Control.is_deleted.is_(False),
        )
        .group_by(Control.health_status)
        .all()
    )
    return {enum_value(status): count for status, count in rows}


def _by_month(ctx, sections):
    """Cuenta registros por mes juntando las filas que aportó cada métrica."""
    counts: dict[str, int] = {}
    for section in sections.values():
        for date_field, rows in section.month_rows.items():
            for row in rows:
                when = getattr(row, date_field, None)
                if when:
                    month = when.strftime("%Y-%m")
                    counts[month] = counts.get(month, 0) + 1
    return dict(sorted(counts.items()))


_GROUPERS = {
    "breed": _by_breed,
    "species": _by_species,
    "field": _by_field,
    "health_status": _by_health_status,
    "month": _by_month,
}


def build_groupings(ctx, sections: dict) -> dict:
    """Devuelve sólo los agrupamientos pedidos que tienen datos que mostrar."""
    grouped = {}
    for group in ctx.spec.group_by:
        result = _GROUPERS[group](ctx, sections)
        if result is not None:
            grouped[group] = result
    return grouped
