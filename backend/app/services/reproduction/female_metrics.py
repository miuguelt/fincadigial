"""Indicadores reproductivos por hembra.

Cada hembra aporta series cortas (intervalos entre partos, días abiertos,
servicios por concepción) que después se agregan a nivel de hato. Separar el
cálculo individual del agregado permite reutilizarlo en la ficha del animal.
"""

from dataclasses import dataclass, field
from datetime import date

from app.models.animals import Animals

from .cycle_rules import CycleRules
from .pregnancy_resolver import (
    CALVED,
    CONFIRMED,
    PENDING,
    AnimalTimeline,
    ServiceUnit,
)

#: Días promedio de un mes calendario (365.25 / 12).
DAYS_PER_MONTH = 30.4375

STATE_HEIFER = "novilla"
STATE_PREGNANT = "preñada"
STATE_SERVED = "servida"
STATE_OPEN = "vacía"


@dataclass
class FemaleMetrics:
    """Serie reproductiva de una hembra y su estado actual."""

    animal_id: int
    record: str
    calving_intervals: list[int] = field(default_factory=list)
    days_open: list[int] = field(default_factory=list)
    calving_to_first_service: list[int] = field(default_factory=list)
    services_per_conception: list[int] = field(default_factory=list)
    age_at_first_calving_months: float | None = None
    #: Primer parto real de la hembra, aunque sea anterior al período.
    first_calving_date: date | None = None
    state: str = STATE_HEIFER
    parity: int = 0
    last_birth_date: date | None = None
    last_service_date: date | None = None
    expected_birth_date: date | None = None
    #: Días abiertos vigentes: desde el último parto sin preñez confirmada.
    current_days_open: int | None = None
    #: Servicios acumulados desde la última concepción confirmada.
    open_services: int = 0


def build_female_metrics(
    animal: Animals,
    timeline: AnimalTimeline | None,
    units: list[ServiceUnit],
    rules: CycleRules,
    today: date | None = None,
    first_calving_date: date | None = None,
) -> FemaleMetrics:
    """Deriva la serie reproductiva de una hembra a partir de su historial.

    ``first_calving_date`` viene del historial completo, no de la ventana
    consultada: sin ese dato el parto más antiguo visible se confundiría con el
    primero de la vida del animal.
    """
    today = today or date.today()
    births = list(timeline.births) if timeline else []
    metrics = FemaleMetrics(
        animal_id=animal.id,
        record=animal.record,
        parity=len(births),
        last_birth_date=births[-1].event_date if births else None,
        last_service_date=units[-1].service_date if units else None,
    )
    metrics.calving_intervals = timeline.calving_intervals if timeline else []
    metrics.first_calving_date = first_calving_date or (
        births[0].event_date if births else None
    )
    metrics.age_at_first_calving_months = _age_at_first_calving(
        animal, metrics.first_calving_date
    )
    metrics.days_open = _days_open(births, units)
    metrics.calving_to_first_service = _calving_to_first_service(births, units)
    metrics.services_per_conception = _services_per_conception(units)
    _apply_state(metrics, units, rules, today)
    return metrics


def _age_at_first_calving(animal: Animals, first_calving: date | None) -> float | None:
    if first_calving is None or not animal.birth_date:
        return None
    days = (first_calving - animal.birth_date).days
    return round(days / DAYS_PER_MONTH, 1) if days > 0 else None


def load_first_calving_dates(finca_id: int) -> dict[int, date]:
    """Primer parto de cada hembra según el historial completo de la finca."""
    from app import db
    from app.models.reproduction import EventType, ReproductiveEvent
    from sqlalchemy import func

    rows = (
        db.session.query(
            ReproductiveEvent.animal_id, func.min(ReproductiveEvent.event_date)
        )
        .filter(
            ReproductiveEvent.finca_id == finca_id,
            ReproductiveEvent.event_type == EventType.Parto,
        )
        .group_by(ReproductiveEvent.animal_id)
        .all()
    )
    return {animal_id: first for animal_id, first in rows}


def _days_open(births: list, units: list[ServiceUnit]) -> list[int]:
    """Días entre cada parto y la concepción que lo sucedió."""
    values = []
    for unit in units:
        if not unit.is_successful:
            continue
        previous = [b for b in births if b.event_date < unit.service_date]
        if not previous:
            continue
        values.append((unit.service_date - previous[-1].event_date).days)
    return values


def _calving_to_first_service(births: list, units: list[ServiceUnit]) -> list[int]:
    """Intervalo parto — primer servicio, indicador del arranque post-parto."""
    values = []
    for index, birth in enumerate(births):
        limit = births[index + 1].event_date if index + 1 < len(births) else None
        for unit in units:
            if unit.service_date <= birth.event_date:
                continue
            if limit is not None and unit.service_date >= limit:
                break
            values.append((unit.service_date - birth.event_date).days)
            break
    return values


def _services_per_conception(units: list[ServiceUnit]) -> list[int]:
    """Servicios consumidos por cada preñez lograda."""
    values = []
    attempts = 0
    for unit in units:
        if unit.outcome == PENDING:
            continue
        attempts += 1
        if unit.is_successful:
            values.append(attempts)
            attempts = 0
    return values


def _apply_state(
    metrics: FemaleMetrics,
    units: list[ServiceUnit],
    rules: CycleRules,
    today: date,
) -> None:
    """Determina el estado reproductivo vigente y los días abiertos actuales."""
    last_unit = units[-1] if units else None
    if last_unit is not None and last_unit.outcome in (CONFIRMED, PENDING):
        metrics.expected_birth_date = last_unit.expected_birth_date
        metrics.state = STATE_PREGNANT if last_unit.outcome == CONFIRMED else STATE_SERVED
    elif metrics.parity > 0 or units:
        metrics.state = STATE_OPEN
    else:
        metrics.state = STATE_HEIFER

    if metrics.state in (STATE_PREGNANT, STATE_SERVED):
        return

    reference = metrics.last_birth_date
    if reference is not None:
        metrics.current_days_open = (today - reference).days
    metrics.open_services = sum(
        1
        for unit in units
        if not unit.is_successful
        and (reference is None or unit.service_date > reference)
    )


def is_breeding_age(animal: Animals, rules: CycleRules, today: date) -> bool:
    """La hembra ya alcanzó la edad mínima de primer servicio."""
    if not animal.birth_date:
        return False
    months = (today - animal.birth_date).days / DAYS_PER_MONTH
    return months >= rules.first_service_age_months


def gestation_day(unit: ServiceUnit, today: date) -> int | None:
    """Día de gestación de una preñez vigente."""
    if unit.outcome not in (CONFIRMED, CALVED):
        return None
    return (today - unit.service_date).days
