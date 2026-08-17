"""Search over the two things a farm is made of: animals and paddocks."""

from typing import Any

from sqlalchemy import String, cast, or_

from .scoring import (
    FIELD_WEIGHTS,
    MIN_SCORE,
    best_score,
    enum_value,
    match_score,
    tokenize,
)

# The database is asked for more rows than requested because the final order is
# decided in Python by score, not by the SQL filter.
_OVERFETCH = 3


def search_animals(
    query: str,
    finca_id: int,
    limit: int = 20,
    include_inactive: bool = False,
) -> list[dict[str, Any]]:
    """Animals by ear tag, QR, breed, species, sex or status."""
    from app.models.animals import AnimalStatus, Animals
    from app.models.breeds import Breeds
    from app.models.species import Species

    tokens = tokenize(query)
    if not tokens:
        return []

    rows = Animals.query.filter(Animals.finca_id == finca_id)
    if not include_inactive:
        rows = rows.filter(Animals.status == AnimalStatus.Vivo)

    rows = rows.outerjoin(Breeds, Animals.breeds_id == Breeds.id).outerjoin(
        Species, Breeds.species_id == Species.id
    )

    rows = rows.filter(
        or_(
            *[
                or_(
                    Animals.record.ilike(f"%{token}%"),
                    Animals.qr_code.ilike(f"%{token}%"),
                    Breeds.name.ilike(f"%{token}%"),
                    Species.name.ilike(f"%{token}%"),
                    cast(Animals.sex, String).ilike(f"%{token}%"),
                    cast(Animals.status, String).ilike(f"%{token}%"),
                )
                for token in tokens
            ]
        )
    )

    results = []
    for animal in rows.limit(limit * _OVERFETCH).all():
        breed = animal.breed
        species = breed.species if breed else None
        score = best_score(
            query,
            [
                (animal.record, FIELD_WEIGHTS["record"]),
                (animal.qr_code, 0.9),
                (breed.name if breed else None, FIELD_WEIGHTS["breed_name"]),
                (species.name if species else None, FIELD_WEIGHTS["species_name"]),
            ],
        )
        if score <= MIN_SCORE:
            continue

        breed_name = breed.name if breed else "Sin raza"
        parts = [breed_name, enum_value(animal.sex)]
        if animal.weight:
            parts.append(f"{animal.weight} kg")

        results.append(
            {
                "id": animal.id,
                "name": animal.record,
                "title": f"Animal: {animal.record}",
                "internal_id": animal.record,
                "species": species.name if species else None,
                "breed": breed_name,
                "score": round(score, 3),
                "type": "animal",
                "url": f"/admin/animals/{animal.id}",
                "description": " • ".join(filter(None, parts)),
            }
        )

    return results


def search_fields(query: str, finca_id: int, limit: int = 10) -> list[dict[str, Any]]:
    """Paddocks and lots by name, location, handling or grass type."""
    from app.models.fields import Fields
    from app.models.foodTypes import FoodTypes

    tokens = tokenize(query)
    if not tokens:
        return []

    rows = Fields.query.filter(Fields.finca_id == finca_id)
    if hasattr(Fields, "is_deleted"):
        rows = rows.filter(Fields.is_deleted.is_(False))

    rows = rows.outerjoin(FoodTypes, Fields.food_type_id == FoodTypes.id).filter(
        or_(
            *[
                or_(
                    Fields.name.ilike(f"%{token}%"),
                    Fields.ubication.ilike(f"%{token}%"),
                    Fields.handlings.ilike(f"%{token}%"),
                    cast(Fields.state, String).ilike(f"%{token}%"),
                    FoodTypes.food_type.ilike(f"%{token}%"),
                )
                for token in tokens
            ]
        )
    )

    results = []
    for field in rows.limit(limit * _OVERFETCH).all():
        food_type = field.food_types.food_type if field.food_types else None
        state = enum_value(field.state, "Activo")
        score = best_score(
            query,
            [
                (field.name, FIELD_WEIGHTS["name"]),
                (field.ubication, 0.7),
                (food_type, 0.8),
                (state, 0.6),
            ],
        )
        if score <= MIN_SCORE:
            continue

        parts = [
            f"{field.area} ha" if field.area and field.area != "0" else None,
            f"Estado: {state}",
            field.ubication,
            food_type,
        ]
        results.append(
            {
                "id": field.id,
                "name": field.name,
                "title": f"Potrero: {field.name}",
                "description": " • ".join(filter(None, parts)) or "Potrero de pastoreo",
                "score": round(score, 3),
                "type": "field",
                "url": "/admin/fields",
            }
        )

    return results


def search_tasks(query: str, finca_id: int, limit: int = 10) -> list[dict[str, Any]]:
    """Tasks and farm activities by title, description, status or priority."""
    from app.models.tasks import Tasks

    tokens = tokenize(query)
    if not tokens:
        return []

    rows = Tasks.query.filter(
        Tasks.finca_id == finca_id,
        or_(
            *[
                or_(
                    Tasks.title.ilike(f"%{token}%"),
                    Tasks.description.ilike(f"%{token}%"),
                    cast(Tasks.status, String).ilike(f"%{token}%"),
                    cast(Tasks.priority, String).ilike(f"%{token}%"),
                )
                for token in tokens
            ]
        ),
    )

    results = []
    for task in rows.limit(limit * 2).all():
        score = max(
            match_score(query, task.title) * FIELD_WEIGHTS["title"],
            match_score(query, task.description or "") * 0.6,
        )
        if score <= MIN_SCORE:
            continue

        status = enum_value(task.status)
        priority = enum_value(task.priority)
        parts = [
            f"Estado: {status}" if status else None,
            f"Prioridad: {priority}" if priority else None,
            task.description,
        ]
        results.append(
            {
                "id": task.id,
                "name": task.title,
                "title": f"Tarea: {task.title}",
                "description": " • ".join(filter(None, parts)) or "Tarea de finca",
                "date": task.due_date.isoformat() if task.due_date else None,
                "score": round(score, 3),
                "type": "task",
                "url": "/admin/tasks",
            }
        )

    return results
