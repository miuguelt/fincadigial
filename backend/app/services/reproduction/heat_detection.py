"""Tasa de detección de celo y tasa de preñez del hato.

La detección de celo no se puede contar directamente: hay que compararla con
las oportunidades que el hato ofreció. Una hembra elegible (en edad, no
preñada y pasado el período de espera voluntario) presenta un celo cada ciclo
estral, así que las oportunidades son los días elegibles divididos por la
duración del ciclo.
"""

from datetime import date, timedelta

from app.models.animals import Animals

from .cycle_rules import CycleRules
from .female_metrics import is_breeding_age
from .pregnancy_resolver import AnimalTimeline, ServiceUnit


def heat_detection_rate(
    animals: dict[int, Animals],
    timelines: dict[int, AnimalTimeline],
    units: dict[int, list[ServiceUnit]],
    rules: CycleRules,
    period_start: date,
    today: date,
) -> tuple[float | None, int, float]:
    """Devuelve ``(tasa, celos observados, oportunidades estimadas)``."""
    observed = 0
    opportunities = 0.0
    for animal_id, animal in animals.items():
        if not is_breeding_age(animal, rules, today):
            continue
        timeline = timelines.get(animal_id)
        animal_units = units.get(animal_id, [])
        observed += _observed_heats(timeline, animal_units, period_start)
        opportunities += _eligible_days(
            animal, timeline, animal_units, rules, period_start, today
        ) / rules.estrous_cycle_days

    if opportunities <= 0:
        return None, observed, 0.0
    return round(observed * 100 / opportunities, 1), observed, round(opportunities, 1)


def pregnancy_rate(detection_pct: float | None, conception_pct: float | None) -> float | None:
    """Tasa de preñez = detección × concepción, la identidad estándar del hato."""
    if detection_pct is None or conception_pct is None:
        return None
    return round(detection_pct * conception_pct / 100, 1)


def _observed_heats(
    timeline: AnimalTimeline | None,
    units: list[ServiceUnit],
    period_start: date,
) -> int:
    """Celos detectados: los registrados más los que implicó cada servicio."""
    seen: set[date] = set()
    if timeline is not None:
        seen.update(
            heat.event_date for heat in timeline.heats if heat.event_date >= period_start
        )
    seen.update(unit.service_date for unit in units if unit.service_date >= period_start)
    return len(seen)


def _eligible_days(
    animal: Animals,
    timeline: AnimalTimeline | None,
    units: list[ServiceUnit],
    rules: CycleRules,
    period_start: date,
    today: date,
) -> int:
    """Días del período en los que la hembra pudo mostrar celo."""
    start = period_start
    if animal.birth_date:
        puberty = animal.birth_date + timedelta(
            days=int(rules.first_service_age_months * 30.4375)
        )
        start = max(start, puberty)
    if start >= today:
        return 0

    blocked = _blocked_intervals(timeline, units, rules)
    eligible = (today - start).days
    for block_start, block_end in blocked:
        overlap_start = max(block_start, start)
        overlap_end = min(block_end, today)
        if overlap_end > overlap_start:
            eligible -= (overlap_end - overlap_start).days
    return max(eligible, 0)


def _blocked_intervals(
    timeline: AnimalTimeline | None,
    units: list[ServiceUnit],
    rules: CycleRules,
) -> list[tuple[date, date]]:
    """Tramos de gestación y espera voluntaria en los que no hay celo útil."""
    blocked = []
    for unit in units:
        if not unit.is_successful:
            continue
        end = unit.birth_date or unit.expected_birth_date
        blocked.append((unit.service_date, end))
    if timeline is not None:
        waiting = timedelta(days=rules.voluntary_waiting_days)
        blocked.extend(
            (birth.event_date, birth.event_date + waiting) for birth in timeline.births
        )
    return blocked
