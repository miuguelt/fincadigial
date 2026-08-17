"""Search over veterinary records and supplies.

Records (treatments, vaccinations, checkups) all hang from an animal, so they
share the same shape: match against the free text of the record or against the
ear tag of its animal, and keep the better of the two.
"""

from typing import Any

from sqlalchemy import String, cast, or_

from .scoring import FIELD_WEIGHTS, MIN_SCORE, enum_value, match_score, tokenize

_OVERFETCH = 3


def _record_score(query: str, text: str, animal_record: str) -> float:
    """Best of matching the record's own text or the ear tag of its animal."""
    return max(match_score(query, text), match_score(query, animal_record))


def _search_treatments(
    query: str, tokens: list[str], finca_id: int, limit: int
) -> list[dict[str, Any]]:
    from app.models.animals import Animals
    from app.models.treatments import Treatments

    rows = (
        Treatments.query.join(Animals, Treatments.animal_id == Animals.id)
        .filter(Animals.finca_id == finca_id)
        .filter(
            or_(
                *[
                    or_(
                        Treatments.description.ilike(f"%{token}%"),
                        Treatments.observations.ilike(f"%{token}%"),
                        Treatments.frequency.ilike(f"%{token}%"),
                        Treatments.dosis.ilike(f"%{token}%"),
                        Animals.record.ilike(f"%{token}%"),
                    )
                    for token in tokens
                ]
            )
        )
    )

    results = []
    for row in rows.limit(limit * _OVERFETCH).all():
        animal_record = row.animals.record if row.animals else "N/A"
        text = " ".join(
            filter(None, [row.description, row.observations, row.frequency, row.dosis])
        )
        score = _record_score(query, text, animal_record)
        if score <= MIN_SCORE:
            continue

        results.append(
            {
                "id": row.id,
                "name": f"Tratamiento #{row.id} - {animal_record}",
                "title": f"Tratamiento: {animal_record}",
                "description": row.description
                or row.observations
                or "Tratamiento veterinario",
                "date": row.treatment_date.isoformat() if row.treatment_date else None,
                "score": round(score, 3),
                "type": "treatment",
                "url": f"/admin/treatments/{row.id}",
            }
        )
    return results


def _search_vaccinations(
    query: str, tokens: list[str], finca_id: int, limit: int
) -> list[dict[str, Any]]:
    from app.models.animals import Animals
    from app.models.vaccinations import Vaccinations
    from app.models.vaccines import Vaccines

    rows = (
        Vaccinations.query.join(Animals, Vaccinations.animal_id == Animals.id)
        .outerjoin(Vaccines, Vaccinations.vaccine_id == Vaccines.id)
        .filter(Animals.finca_id == finca_id)
        .filter(
            or_(
                *[
                    or_(
                        Vaccinations.notes.ilike(f"%{token}%"),
                        Vaccinations.batch_number.ilike(f"%{token}%"),
                        Vaccinations.dosis.ilike(f"%{token}%"),
                        Vaccines.name.ilike(f"%{token}%"),
                        Animals.record.ilike(f"%{token}%"),
                    )
                    for token in tokens
                ]
            )
        )
    )

    results = []
    for row in rows.limit(limit * _OVERFETCH).all():
        animal_record = row.animals.record if row.animals else "N/A"
        vaccine_name = row.vaccines.name if row.vaccines else "Vacuna"
        text = " ".join(filter(None, [vaccine_name, row.notes, row.batch_number]))
        score = _record_score(query, text, animal_record)
        if score <= MIN_SCORE:
            continue

        results.append(
            {
                "id": row.id,
                "name": f"Vacunación #{row.id} - {animal_record}",
                "title": f"Vacunación: {animal_record} ({vaccine_name})",
                "description": f"{vaccine_name} • {row.notes or 'Aplicación de biológico'}",
                "date": row.vaccination_date.isoformat()
                if row.vaccination_date
                else None,
                "score": round(score, 3),
                "type": "vaccination",
                "url": f"/admin/vaccinations/{row.id}",
            }
        )
    return results


def _search_controls(
    query: str, tokens: list[str], finca_id: int, limit: int
) -> list[dict[str, Any]]:
    from app.models.animals import Animals
    from app.models.control import Control

    rows = (
        Control.query.join(Animals, Control.animal_id == Animals.id)
        .filter(Animals.finca_id == finca_id)
        .filter(
            or_(
                *[
                    or_(
                        Control.description.ilike(f"%{token}%"),
                        # PostgreSQL no compara un enum con texto sin este cast explícito.
                        cast(Control.health_status, String).ilike(f"%{token}%"),
                        Animals.record.ilike(f"%{token}%"),
                    )
                    for token in tokens
                ]
            )
        )
    )

    results = []
    for row in rows.limit(limit * _OVERFETCH).all():
        animal_record = row.animals.record if row.animals else "N/A"
        health = enum_value(row.health_status, "Control")
        score = _record_score(query, f"{row.description or ''} {health}", animal_record)
        if score <= MIN_SCORE:
            continue

        parts = [
            f"Estado: {health}",
            f"{row.weight} kg" if row.weight else None,
            row.description,
        ]
        results.append(
            {
                "id": row.id,
                "name": f"Control #{row.id} - {animal_record}",
                "title": f"Control de Salud: {animal_record}",
                "description": " • ".join(filter(None, parts))
                or "Control veterinario periódico",
                "date": row.checkup_date.isoformat() if row.checkup_date else None,
                "score": round(score, 3),
                "type": "control",
                "url": "/admin/control",
            }
        )
    return results


_RECORD_SEARCHERS = {
    "treatment": _search_treatments,
    "vaccination": _search_vaccinations,
    "control": _search_controls,
}


def search_records(
    query: str,
    finca_id: int,
    record_type: str | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    """Medical records: treatments, vaccinations and health checkups."""
    tokens = tokenize(query)
    if not tokens:
        return []

    searchers = (
        [_RECORD_SEARCHERS[record_type]]
        if record_type in _RECORD_SEARCHERS
        else list(_RECORD_SEARCHERS.values())
    )

    results: list[dict[str, Any]] = []
    for searcher in searchers:
        results.extend(searcher(query, tokens, finca_id, limit))
    return results


def search_supplies(query: str, finca_id: int, limit: int = 10) -> list[dict[str, Any]]:
    """Veterinary supplies: the medication and vaccine catalogues."""
    from app.models.medications import Medications
    from app.models.vaccines import Vaccines

    tokens = tokenize(query)
    if not tokens:
        return []

    results: list[dict[str, Any]] = []

    medications = (
        Medications.query.filter(
            Medications.finca_id == finca_id,
            or_(
                *[
                    or_(
                        Medications.name.ilike(f"%{token}%"),
                        Medications.description.ilike(f"%{token}%"),
                        Medications.indications.ilike(f"%{token}%"),
                    )
                    for token in tokens
                ]
            ),
        )
        .limit(limit * 2)
        .all()
    )

    for row in medications:
        score = max(
            match_score(query, row.name) * FIELD_WEIGHTS["name"],
            match_score(query, row.description or "") * 0.7,
        )
        if score <= MIN_SCORE:
            continue
        results.append(
            {
                "id": row.id,
                "name": row.name,
                "title": f"Medicamento: {row.name}",
                "description": row.description
                or row.indications
                or "Insumo veterinario",
                "score": round(score, 3),
                "type": "medication",
                "url": "/admin/medications",
            }
        )

    vaccines = (
        Vaccines.query.filter(
            Vaccines.finca_id == finca_id,
            or_(
                *[
                    or_(
                        Vaccines.name.ilike(f"%{token}%"),
                        Vaccines.national_plan.ilike(f"%{token}%"),
                    )
                    for token in tokens
                ]
            ),
        )
        .limit(limit * 2)
        .all()
    )

    for row in vaccines:
        score = max(
            match_score(query, row.name) * FIELD_WEIGHTS["name"],
            match_score(query, row.national_plan or "") * 0.7,
        )
        if score <= MIN_SCORE:
            continue
        parts = [
            f"Plan: {row.national_plan}" if row.national_plan else None,
            f"Dosis: {row.dosis}" if row.dosis else None,
        ]
        results.append(
            {
                "id": row.id,
                "name": row.name,
                "title": f"Vacuna: {row.name}",
                "description": " • ".join(filter(None, parts))
                or "Biológico veterinario",
                "score": round(score, 3),
                "type": "vaccine",
                "url": "/admin/vaccines",
            }
        )

    return results
