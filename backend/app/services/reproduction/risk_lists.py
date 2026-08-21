"""Listas accionables del hato reproductivo.

Los indicadores agregados dicen si la finca va bien; estas listas dicen sobre
qué animal actuar hoy. Cada entrada nombra el animal, la razón y el dato que
la sustenta para que el operario no tenga que interpretarla.
"""

from datetime import date, timedelta

from app.models.animals import Animals

from .cycle_rules import CycleRules
from .female_metrics import (
    STATE_OPEN,
    FemaleMetrics,
    is_breeding_age,
)
from .pregnancy_resolver import CONFIRMED, PENDING, ServiceUnit

#: Servicios fallidos consecutivos que definen una vaca repetidora.
REPEAT_BREEDER_SERVICES = 3
#: Horizonte de partos próximos que se reporta a maternidad.
UPCOMING_BIRTH_DAYS = 30


def build_risk_lists(
    animals: dict[int, Animals],
    metrics: dict[int, FemaleMetrics],
    units: dict[int, list[ServiceUnit]],
    rules: CycleRules,
    today: date | None = None,
) -> dict[str, list[dict]]:
    """Construye todas las listas de atención reproductiva de la finca."""
    today = today or date.today()
    pregnancies = _active_pregnancies(units, today)

    return {
        "open_over_limit": _open_over_limit(animals, metrics, rules),
        "repeat_breeders": _repeat_breeders(animals, metrics),
        "heifers_without_service": _heifers_without_service(
            animals, metrics, rules, today
        ),
        "unconfirmed_services": _unconfirmed_services(animals, units, rules, today),
        "overdue_births": _overdue_births(animals, pregnancies, today),
        "due_for_dry_off": _due_for_dry_off(animals, pregnancies, rules, today),
        "upcoming_births": _upcoming_births(animals, pregnancies, today),
    }


def _entry(animal: Animals, **extra) -> dict:
    return {
        "animal_id": animal.id,
        "record": animal.record,
        **extra,
    }


def _active_pregnancies(
    units: dict[int, list[ServiceUnit]], today: date
) -> dict[int, ServiceUnit]:
    """Última unidad de servicio vigente por hembra."""
    active = {}
    for animal_id, animal_units in units.items():
        if not animal_units:
            continue
        last = animal_units[-1]
        if last.outcome in (CONFIRMED, PENDING):
            active[animal_id] = last
    return active


def _open_over_limit(
    animals: dict[int, Animals],
    metrics: dict[int, FemaleMetrics],
    rules: CycleRules,
) -> list[dict]:
    """Vacas paridas que llevan demasiados días sin quedar preñadas."""
    rows = [
        _entry(
            animals[animal_id],
            days_open=metric.current_days_open,
            services_since_calving=metric.open_services,
            last_birth_date=_iso(metric.last_birth_date),
            parity=metric.parity,
        )
        for animal_id, metric in metrics.items()
        if animal_id in animals
        and metric.state == STATE_OPEN
        and metric.current_days_open is not None
        and metric.current_days_open > rules.max_days_open
    ]
    return sorted(rows, key=lambda row: -row["days_open"])


def _repeat_breeders(
    animals: dict[int, Animals], metrics: dict[int, FemaleMetrics]
) -> list[dict]:
    """Hembras con servicios repetidos sin preñez confirmada."""
    rows = [
        _entry(
            animals[animal_id],
            failed_services=metric.open_services,
            last_service_date=_iso(metric.last_service_date),
        )
        for animal_id, metric in metrics.items()
        if animal_id in animals and metric.open_services >= REPEAT_BREEDER_SERVICES
    ]
    return sorted(rows, key=lambda row: -row["failed_services"])


def _heifers_without_service(
    animals: dict[int, Animals],
    metrics: dict[int, FemaleMetrics],
    rules: CycleRules,
    today: date,
) -> list[dict]:
    """Novillas en edad de servicio que nunca han sido servidas."""
    rows = []
    for animal_id, animal in animals.items():
        metric = metrics.get(animal_id)
        if metric is not None and (metric.parity > 0 or metric.last_service_date):
            continue
        if not is_breeding_age(animal, rules, today):
            continue
        rows.append(
            _entry(animal, age_months=_age_months(animal, today), reason="sin servicio")
        )
    return sorted(rows, key=lambda row: -(row["age_months"] or 0))


def _unconfirmed_services(
    animals: dict[int, Animals],
    units: dict[int, list[ServiceUnit]],
    rules: CycleRules,
    today: date,
) -> list[dict]:
    """Servicios sin diagnóstico pasada la ventana de confirmación."""
    rows = []
    for animal_id, animal_units in units.items():
        animal = animals.get(animal_id)
        if animal is None or not animal_units:
            continue
        last = animal_units[-1]
        elapsed = (today - last.service_date).days
        if last.outcome != PENDING or elapsed < rules.service_confirmation_days:
            continue
        rows.append(
            _entry(
                animal,
                service_date=_iso(last.service_date),
                days_since_service=elapsed,
                technique=last.technique,
            )
        )
    return sorted(rows, key=lambda row: -row["days_since_service"])


def _overdue_births(
    animals: dict[int, Animals], pregnancies: dict[int, ServiceUnit], today: date
) -> list[dict]:
    """Preñeces que pasaron su fecha probable de parto."""
    rows = [
        _entry(
            animals[animal_id],
            expected_birth_date=_iso(unit.expected_birth_date),
            days_overdue=(today - unit.expected_birth_date).days,
        )
        for animal_id, unit in pregnancies.items()
        if animal_id in animals and unit.expected_birth_date < today
    ]
    return sorted(rows, key=lambda row: -row["days_overdue"])


def _due_for_dry_off(
    animals: dict[int, Animals],
    pregnancies: dict[int, ServiceUnit],
    rules: CycleRules,
    today: date,
) -> list[dict]:
    """Vacas lactando que deben entrar a secado antes del parto."""
    rows = []
    for animal_id, unit in pregnancies.items():
        animal = animals.get(animal_id)
        if animal is None or not animal.is_lactating:
            continue
        dry_off_date = unit.expected_birth_date - timedelta(
            days=rules.dry_off_days_before_birth
        )
        if dry_off_date > today:
            continue
        rows.append(
            _entry(
                animal,
                dry_off_date=_iso(dry_off_date),
                expected_birth_date=_iso(unit.expected_birth_date),
                days_late=(today - dry_off_date).days,
            )
        )
    return sorted(rows, key=lambda row: -row["days_late"])


def _upcoming_births(
    animals: dict[int, Animals], pregnancies: dict[int, ServiceUnit], today: date
) -> list[dict]:
    """Partos esperados en el horizonte cercano."""
    horizon = today + timedelta(days=UPCOMING_BIRTH_DAYS)
    rows = [
        _entry(
            animals[animal_id],
            expected_birth_date=_iso(unit.expected_birth_date),
            days_to_birth=(unit.expected_birth_date - today).days,
            sire_id=unit.sire_id,
        )
        for animal_id, unit in pregnancies.items()
        if animal_id in animals and today <= unit.expected_birth_date <= horizon
    ]
    return sorted(rows, key=lambda row: row["days_to_birth"])


def _age_months(animal: Animals, today: date) -> float | None:
    from .female_metrics import DAYS_PER_MONTH

    if not animal.birth_date:
        return None
    return round((today - animal.birth_date).days / DAYS_PER_MONTH, 1)


def _iso(value: date | None) -> str | None:
    return value.isoformat() if value else None
