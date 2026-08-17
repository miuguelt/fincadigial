"""ICA compliance traffic light, for one animal and for the whole herd.

Both views answer the same question — when was each mandatory application last
done and is it still valid — so the keyword lists, the validity windows and the
green/yellow/red ladder live here once. They used to be copied in two places
and had already drifted: the herd view also reads vaccinations, the per-animal
view only treatments.
"""

from collections import defaultdict
from datetime import date

from sqlalchemy import desc, or_

# Palabras con las que se reconoce cada aplicación en el texto libre del
# registro. La finca escribe "aftosa", "fiebre aftosa" o el nombre comercial.
ICA_KEYWORDS: dict[str, tuple[str, ...]] = {
    "aftosa": ("aftosa",),
    "brucelosis": ("brucelosis", "brucela", "rb51"),
    "desparasitacion": ("desparasit", "ivermectin", "albendazol", "levamisol"),
    "clostridial": ("clostridial", "clostridi", "enterotoxemia"),
}

# Días de vigencia de cada aplicación antes de quedar vencida.
ICA_MAX_DAYS: dict[str, int] = {
    "aftosa": 180,
    "brucelosis": 365,
    "desparasitacion": 120,
    "clostridial": 365,
}

# A partir de este porcentaje de la vigencia se avisa antes de que venza.
_DUE_SOON_RATIO = 0.85

ALL_ICA_KEYWORDS = tuple(word for words in ICA_KEYWORDS.values() for word in words)


def compliance_status(applied_date: date | None, max_days: int, today: date) -> dict:
    """Estado de una sola aplicación: sin registro, vencida, por vencer o al día."""
    if not applied_date:
        return {"status": "missing", "days": None, "date": None}

    days = (today - applied_date).days
    iso = applied_date.isoformat()
    if days > max_days:
        return {"status": "overdue", "days": days, "date": iso}
    if days > int(max_days * _DUE_SOON_RATIO):
        return {"status": "due_soon", "days": days, "date": iso}
    return {"status": "ok", "days": days, "date": iso}


def overall_light(checks: dict[str, dict]) -> str:
    """Rojo si algo está vencido, amarillo si falta o está por vencer, verde si todo al día."""
    states = [check["status"] for check in checks.values()]
    if "overdue" in states:
        return "red"
    if any(state in ("missing", "due_soon") for state in states):
        return "yellow"
    return "green"


def _build_checks(find_date) -> dict[str, dict]:
    """Arma las cuatro casillas llamando a `find_date(keywords)` por cada una."""
    today = date.today()
    return {
        name: compliance_status(
            find_date(ICA_KEYWORDS[name]), ICA_MAX_DAYS[name], today
        )
        for name in ICA_KEYWORDS
    }


def check_animal_ica(animal_id: int, today: date) -> dict:
    """Semáforo ICA de un animal, mirando sólo sus tratamientos."""
    from app.models.treatments import Treatments

    def last_treatment_date(keywords):
        treatment = (
            Treatments.query.filter(
                Treatments.animal_id == animal_id,
                or_(*[Treatments.description.ilike(f"%{word}%") for word in keywords]),
            )
            .order_by(desc(Treatments.treatment_date))
            .first()
        )
        return treatment.treatment_date if treatment else None

    checks = {
        name: compliance_status(
            last_treatment_date(ICA_KEYWORDS[name]), ICA_MAX_DAYS[name], today
        )
        for name in ICA_KEYWORDS
    }
    return {"overall": overall_light(checks), "checks": checks}


def _event_date(event):
    return getattr(event, "treatment_date", None) or getattr(
        event, "vaccination_date", None
    )


def _event_text(event) -> str:
    """Texto donde buscar las palabras clave, según sea tratamiento o vacunación."""
    from app.models.vaccinations import Vaccinations

    if isinstance(event, Vaccinations):
        vaccine = event.vaccines
        disease = getattr(getattr(vaccine, "diseases", None), "name", "")
        parts = [getattr(vaccine, "name", ""), disease, event.notes or ""]
        return " ".join(filter(None, parts)).lower()
    return (event.description or "").lower()


def _load_herd_events(finca_id: int, animal_ids: list[int]) -> dict[int, list]:
    """Trae de una vez todos los eventos ICA del hato, agrupados por animal.

    Una consulta por animal convertía el semáforo del hato en cientos de
    consultas; aquí son dos, y el ordenamiento se hace en memoria.
    """
    from app.models.treatments import Treatments
    from app.models.vaccinations import Vaccinations

    treatments = (
        Treatments.query.filter(
            Treatments.finca_id == finca_id,
            Treatments.animal_id.in_(animal_ids),
            or_(
                *[
                    Treatments.description.ilike(f"%{word}%")
                    for word in ALL_ICA_KEYWORDS
                ]
            ),
        )
        .order_by(desc(Treatments.treatment_date))
        .all()
    )
    vaccinations = (
        Vaccinations.query.filter(
            Vaccinations.finca_id == finca_id,
            Vaccinations.animal_id.in_(animal_ids),
            Vaccinations.is_deleted.is_(False),
        )
        .order_by(desc(Vaccinations.vaccination_date))
        .all()
    )

    events_by_animal: dict[int, list] = defaultdict(list)
    for event in (*treatments, *vaccinations):
        events_by_animal[event.animal_id].append(event)
    for events in events_by_animal.values():
        events.sort(key=lambda event: _event_date(event) or date.min, reverse=True)
    return events_by_animal


def herd_ica_compliance(finca_id: int) -> dict:
    """Semáforo ICA de todo el hato, con el detalle por animal."""
    from app.models.animals import AnimalStatus, Animals

    animals = Animals.query.filter_by(finca_id=finca_id, status=AnimalStatus.Vivo).all()
    if not animals:
        return {
            "counts": {"green": 0, "yellow": 0, "red": 0},
            "total": 0,
            "animals": [],
        }

    events_by_animal = _load_herd_events(finca_id, [animal.id for animal in animals])

    counts = {"green": 0, "yellow": 0, "red": 0}
    detail = []

    for animal in animals:
        events = events_by_animal.get(animal.id, [])

        def last_matching_date(keywords, events=events):
            for event in events:
                text = _event_text(event)
                if any(word in text for word in keywords):
                    return _event_date(event)
            return None

        checks = _build_checks(last_matching_date)
        light = overall_light(checks)
        counts[light] += 1

        detail.append(
            {
                "animal_id": animal.id,
                "record": animal.record,
                "name": getattr(animal, "alias", "") or getattr(animal, "name", ""),
                "sex": animal.sex.value if hasattr(animal.sex, "value") else animal.sex,
                "overall": light,
                "checks": checks,
            }
        )

    return {"counts": counts, "total": len(animals), "animals": detail}
