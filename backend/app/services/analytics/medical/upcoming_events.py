"""What the farm has coming up: births, post-partum checks, vaccinations, checkups.

Every block loads its rows in one query for the whole herd and keeps the most
recent event per animal in Python. Asking per animal turned this endpoint into
hundreds of queries on a farm with a few hundred head.
"""

from datetime import UTC, date, datetime, timedelta

from sqlalchemy import desc, or_

from app.models.system_content import SystemContent

# Ventanas de búsqueda: cuánto historial hace falta cargar para decidir.
_GESTATION_LOOKBACK_DAYS = 300
_POSTPARTUM_WINDOW_DAYS = 22
_VACCINE_LOOKBACK_DAYS = 210
_CONTROL_LOOKBACK_DAYS = 100

# Un parto se sigue mostrando hasta dos semanas después de la fecha esperada.
_OVERDUE_BIRTH_GRACE_DAYS = 14
_IMMINENT_BIRTH_DAYS = 7
_VACCINE_WINDOW_DAYS = 30

_CLINICAL_DEFAULTS = {
    "gestacion_dias": 283,
    "ica_vacuna_intervalo": 180,
    "control_dias_min": 60,
    "control_dias_max": 90,
}


def clinical_param(key: str) -> int:
    """Parámetro clínico configurable, con el valor de referencia como respaldo.

    Antes devolvía `None` cuando el parámetro no estaba cargado y la aritmética
    que seguía reventaba con `TypeError`; ahora cae al valor por defecto.
    """
    entry = SystemContent.get_by_key(f"param.clinical.{key}")
    if entry:
        try:
            return int(float(entry.content))
        except (ValueError, TypeError):
            pass
    return _CLINICAL_DEFAULTS[key]


def _first_per_animal(rows):
    """Se queda con el primer registro de cada animal; las filas llegan ya ordenadas."""
    seen = set()
    for row in rows:
        if row.animal_id in seen:
            continue
        seen.add(row.animal_id)
        yield row


def _upcoming_births(female_ids, animal_map, today, days_ahead) -> list[dict]:
    from app.models.geneticImprovements import GeneticImprovements

    gestations = (
        GeneticImprovements.query.filter(
            GeneticImprovements.animal_id.in_(female_ids),
            GeneticImprovements.date
            >= today - timedelta(days=_GESTATION_LOOKBACK_DAYS),
            or_(
                GeneticImprovements.results.ilike("%positivo%"),
                GeneticImprovements.results.ilike("%preñada%"),
                GeneticImprovements.results.ilike("%gestante%"),
            ),
        )
        .order_by(GeneticImprovements.animal_id, desc(GeneticImprovements.date))
        .all()
    )

    gestation_days = clinical_param("gestacion_dias")
    births = []
    for event in _first_per_animal(gestations):
        expected = event.date + timedelta(days=gestation_days)
        remaining = (expected - today).days
        if not -_OVERDUE_BIRTH_GRACE_DAYS <= remaining <= days_ahead:
            continue
        if remaining < 0:
            status = "overdue"
        elif remaining <= _IMMINENT_BIRTH_DAYS:
            status = "imminent"
        else:
            status = "upcoming"
        births.append(
            {
                "animal_id": event.animal_id,
                "record": animal_map[event.animal_id].record,
                "expected_birth": expected.isoformat(),
                "days_to_birth": remaining,
                "status": status,
            }
        )
    return births


def _postpartum(female_ids, animal_map, today) -> list[dict]:
    from app.models.geneticImprovements import GeneticImprovements

    births = (
        GeneticImprovements.query.filter(
            GeneticImprovements.animal_id.in_(female_ids),
            GeneticImprovements.date >= today - timedelta(days=_POSTPARTUM_WINDOW_DAYS),
            or_(
                GeneticImprovements.details.ilike("%parto%"),
                GeneticImprovements.genetic_event_technique.ilike("%parto%"),
                GeneticImprovements.results.ilike("%parto%"),
            ),
        )
        .order_by(GeneticImprovements.animal_id, desc(GeneticImprovements.date))
        .all()
    )

    monitoring = []
    for event in _first_per_animal(births):
        elapsed = (today - event.date).days
        monitoring.append(
            {
                "animal_id": event.animal_id,
                "record": animal_map[event.animal_id].record,
                "birth_date": event.date.isoformat(),
                "days_postparto": elapsed,
                "next_check": (
                    event.date + timedelta(days=14 if elapsed < 14 else 21)
                ).isoformat(),
            }
        )
    return monitoring


def _vaccinations_due(animal_ids, animal_map, today) -> list[dict]:
    from app.models.treatments import Treatments

    applied = (
        Treatments.query.filter(
            Treatments.animal_id.in_(animal_ids),
            Treatments.treatment_date >= today - timedelta(days=_VACCINE_LOOKBACK_DAYS),
            or_(
                Treatments.description.ilike("%aftosa%"),
                Treatments.description.ilike("%brucelosis%"),
                Treatments.description.ilike("%brucela%"),
            ),
        )
        .order_by(Treatments.animal_id, desc(Treatments.treatment_date))
        .all()
    )

    interval = clinical_param("ica_vacuna_intervalo")
    due = []
    for treatment in _first_per_animal(applied):
        remaining = interval - (today - treatment.treatment_date).days
        if not -_VACCINE_WINDOW_DAYS <= remaining <= _VACCINE_WINDOW_DAYS:
            continue
        due.append(
            {
                "animal_id": treatment.animal_id,
                "record": animal_map[treatment.animal_id].record,
                "vaccine": "Aftosa / Brucelosis ICA",
                "last_date": treatment.treatment_date.isoformat(),
                "due_date": (
                    treatment.treatment_date + timedelta(days=interval)
                ).isoformat(),
                "days_remaining": remaining,
                "status": "overdue" if remaining < 0 else "due_soon",
            }
        )
    return due


def _controls_due(animal_ids, animal_map, today) -> list[dict]:
    from app.models.control import Control

    checkups = (
        Control.query.filter(
            Control.animal_id.in_(animal_ids),
            Control.checkup_date >= today - timedelta(days=_CONTROL_LOOKBACK_DAYS),
        )
        .order_by(Control.animal_id, desc(Control.checkup_date))
        .all()
    )

    min_days = clinical_param("control_dias_min")
    max_days = clinical_param("control_dias_max")
    due = []
    for control in _first_per_animal(checkups):
        elapsed = (today - control.checkup_date).days
        if not min_days <= elapsed <= max_days:
            continue
        due.append(
            {
                "animal_id": control.animal_id,
                "record": animal_map[control.animal_id].record,
                "last_control": control.checkup_date.isoformat(),
                "days_since": elapsed,
                "recommended_by": (
                    control.checkup_date + timedelta(days=min_days)
                ).isoformat(),
            }
        )
    return due


def _empty(days_ahead: int) -> dict:
    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "horizon_days": days_ahead,
        "upcoming_births": [],
        "postparto_monitoring": [],
        "vaccination_due": [],
        "controls_due": [],
        "summary": {
            "births": 0,
            "postparto": 0,
            "vaccinations_due": 0,
            "controls_due": 0,
            "total": 0,
        },
    }


def get_upcoming_events(days_ahead: int = 30) -> dict:
    """Eventos ganaderos previstos dentro del horizonte indicado."""
    from app.models.animals import AnimalStatus, Animals, Sex
    from app.utils.tenant_context import get_current_finca_id

    finca_id = get_current_finca_id()
    if not finca_id:
        return _empty(days_ahead)

    animals = Animals.query.filter_by(finca_id=finca_id, status=AnimalStatus.Vivo).all()
    if not animals:
        return _empty(days_ahead)

    today = date.today()
    animal_map = {animal.id: animal for animal in animals}
    animal_ids = list(animal_map)
    female_ids = [animal.id for animal in animals if animal.sex == Sex.Hembra]

    births = (
        _upcoming_births(female_ids, animal_map, today, days_ahead)
        if female_ids
        else []
    )
    postpartum = _postpartum(female_ids, animal_map, today) if female_ids else []
    vaccinations = _vaccinations_due(animal_ids, animal_map, today)
    controls = _controls_due(animal_ids, animal_map, today)

    return {
        "generated_at": datetime.now(UTC).isoformat(),
        "horizon_days": days_ahead,
        "upcoming_births": sorted(births, key=lambda row: row["days_to_birth"]),
        "postparto_monitoring": sorted(
            postpartum, key=lambda row: row["days_postparto"]
        ),
        "vaccination_due": sorted(vaccinations, key=lambda row: row["days_remaining"]),
        "controls_due": sorted(
            controls, key=lambda row: row["days_since"], reverse=True
        ),
        "summary": {
            "births": len(births),
            "postparto": len(postpartum),
            "vaccinations_due": len(vaccinations),
            "controls_due": len(controls),
            "total": len(births) + len(postpartum) + len(vaccinations) + len(controls),
        },
    }
