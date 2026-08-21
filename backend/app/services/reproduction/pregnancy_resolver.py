"""Emparejamiento de servicio ↔ diagnóstico ↔ parto.

El registro guarda eventos sueltos. Casi todo indicador reproductivo real
necesita la *unidad de servicio*: la monta o inseminación junto al desenlace
que le corresponde. Este módulo reconstruye esa unidad respetando las ventanas
biológicas, de modo que un diagnóstico o un parto no puedan atribuirse a un
servicio con el que son incompatibles en el tiempo.
"""

from dataclasses import dataclass, field
from datetime import date, timedelta

from app.models.reproduction import DiagnosisResult, EventType, ReproductiveEvent

from .cycle_rules import CycleRules, load_rules

#: Servicio aún dentro de la ventana en la que puede confirmarse.
PENDING = "pending"
#: Preñez confirmada por diagnóstico, sin parto todavía.
CONFIRMED = "confirmed"
#: Servicio que terminó en parto.
CALVED = "calved"
#: Servicio que no dejó preñez.
FAILED = "failed"
#: Preñez confirmada que se perdió antes del parto.
ABORTED = "aborted"

_SUCCESSFUL = (CONFIRMED, CALVED, ABORTED)


@dataclass(frozen=True)
class ServiceUnit:
    """Un servicio y el desenlace que le corresponde."""

    animal_id: int
    service_id: int
    service_date: date
    expected_birth_date: date
    sire_id: int | None = None
    technique: str | None = None
    outcome: str = PENDING
    diagnosis_date: date | None = None
    birth_date: date | None = None
    birth_event_id: int | None = None

    @property
    def is_successful(self) -> bool:
        return self.outcome in _SUCCESSFUL

    @property
    def conception_date(self) -> date | None:
        """Fecha de concepción atribuible al servicio, si prosperó."""
        return self.service_date if self.is_successful else None

    @property
    def days_to_diagnosis(self) -> int | None:
        if self.diagnosis_date is None:
            return None
        return (self.diagnosis_date - self.service_date).days


@dataclass
class AnimalTimeline:
    """Eventos reproductivos de una hembra, ordenados y clasificados."""

    animal_id: int
    services: list[ReproductiveEvent] = field(default_factory=list)
    diagnoses: list[ReproductiveEvent] = field(default_factory=list)
    births: list[ReproductiveEvent] = field(default_factory=list)
    heats: list[ReproductiveEvent] = field(default_factory=list)
    dry_offs: list[ReproductiveEvent] = field(default_factory=list)

    @property
    def last_birth_date(self) -> date | None:
        return self.births[-1].event_date if self.births else None

    @property
    def calving_intervals(self) -> list[int]:
        return [
            (self.births[index].event_date - self.births[index - 1].event_date).days
            for index in range(1, len(self.births))
        ]


def load_timelines(finca_id: int, since: date | None = None) -> dict[int, AnimalTimeline]:
    """Carga y agrupa los eventos reproductivos de una finca en una consulta."""
    query = ReproductiveEvent.query.filter(ReproductiveEvent.finca_id == finca_id)
    if since is not None:
        query = query.filter(ReproductiveEvent.event_date >= since)
    events = query.order_by(
        ReproductiveEvent.event_date.asc(), ReproductiveEvent.id.asc()
    ).all()

    timelines: dict[int, AnimalTimeline] = {}
    buckets = {
        EventType.Inseminacion: "services",
        EventType.Diagnostico: "diagnoses",
        EventType.Parto: "births",
        EventType.Celo: "heats",
        EventType.Secado: "dry_offs",
    }
    for event in events:
        bucket = buckets.get(event.event_type)
        if bucket is None:
            continue
        timeline = timelines.setdefault(
            event.animal_id, AnimalTimeline(animal_id=event.animal_id)
        )
        getattr(timeline, bucket).append(event)
    return timelines


def build_service_units(
    animal_ids: list[int] | None,
    finca_id: int,
    rules: CycleRules | None = None,
    timelines: dict[int, AnimalTimeline] | None = None,
) -> dict[int, list[ServiceUnit]]:
    """Resuelve el desenlace de cada servicio de las hembras indicadas."""
    rules = rules or load_rules(finca_id)
    timelines = timelines if timelines is not None else load_timelines(finca_id)
    wanted = set(animal_ids) if animal_ids is not None else set(timelines)
    return {
        animal_id: resolve_timeline(timeline, rules)
        for animal_id, timeline in timelines.items()
        if animal_id in wanted
    }


def resolve_timeline(timeline: AnimalTimeline, rules: CycleRules) -> list[ServiceUnit]:
    """Convierte los eventos de una hembra en unidades de servicio resueltas."""
    today = date.today()
    births_by_service = _assign_births(timeline.services, timeline.births, rules)
    units: list[ServiceUnit] = []
    for index, service in enumerate(timeline.services):
        next_service = (
            timeline.services[index + 1]
            if index + 1 < len(timeline.services)
            else None
        )
        units.append(
            _resolve_service(
                service,
                next_service,
                timeline,
                rules,
                today,
                births_by_service.get(service.id),
            )
        )
    return units


def _expected_birth(service: ReproductiveEvent, rules: CycleRules) -> date:
    return service.expected_birth_date or (
        service.event_date + timedelta(days=rules.gestation_days)
    )


def _assign_births(
    services: list[ReproductiveEvent],
    births: list[ReproductiveEvent],
    rules: CycleRules,
) -> dict[int, ReproductiveEvent]:
    """Atribuye cada parto al servicio cuya gestación mejor lo explica.

    La atribución es exclusiva: con re-servicios cada 21 días la ventana de
    tolerancia admite varios candidatos, y sin exclusividad el mismo parto
    confirmaría dos servicios e inflaría la tasa de concepción.
    """
    assignment: dict[int, ReproductiveEvent] = {}
    for birth in births:
        best: ReproductiveEvent | None = None
        best_delta: int | None = None
        for service in services:
            if service.id in assignment:
                continue
            delta = abs((birth.event_date - _expected_birth(service, rules)).days)
            if delta > rules.birth_window_days:
                continue
            if best_delta is None or delta < best_delta:
                best, best_delta = service, delta
        if best is not None:
            assignment[best.id] = birth
    return assignment


def _resolve_service(
    service: ReproductiveEvent,
    next_service: ReproductiveEvent | None,
    timeline: AnimalTimeline,
    rules: CycleRules,
    today: date,
    birth: ReproductiveEvent | None,
) -> ServiceUnit:
    expected_birth = _expected_birth(service, rules)
    diagnosis = _matching_diagnosis(service, next_service, timeline, rules)
    outcome = _outcome(service, next_service, birth, diagnosis, rules, today, expected_birth)

    return ServiceUnit(
        animal_id=service.animal_id,
        service_id=service.id,
        service_date=service.event_date,
        expected_birth_date=expected_birth,
        sire_id=service.sire_id,
        technique=service.technique.value if service.technique else None,
        outcome=outcome,
        diagnosis_date=diagnosis.event_date if diagnosis else None,
        birth_date=birth.event_date if birth else None,
        birth_event_id=birth.id if birth else None,
    )


def _matching_diagnosis(
    service: ReproductiveEvent,
    next_service: ReproductiveEvent | None,
    timeline: AnimalTimeline,
    rules: CycleRules,
) -> ReproductiveEvent | None:
    """Primer diagnóstico concluyente atribuible al servicio."""
    lower = service.event_date + timedelta(days=rules.diagnosis_min_days)
    upper = service.event_date + timedelta(days=rules.diagnosis_max_days)
    if next_service is not None:
        upper = min(upper, next_service.event_date)
    for diagnosis in timeline.diagnoses:
        if diagnosis.diagnosis_result in (None, DiagnosisResult.Pendiente):
            continue
        if lower <= diagnosis.event_date <= upper:
            return diagnosis
    return None


def _outcome(
    service: ReproductiveEvent,
    next_service: ReproductiveEvent | None,
    birth: ReproductiveEvent | None,
    diagnosis: ReproductiveEvent | None,
    rules: CycleRules,
    today: date,
    expected_birth: date,
) -> str:
    if birth is not None:
        return CALVED
    positive = diagnosis is not None and diagnosis.diagnosis_result == DiagnosisResult.Positivo
    if diagnosis is not None and not positive:
        return FAILED
    overdue = today > expected_birth + timedelta(days=rules.birth_window_days)
    if positive:
        if next_service is not None and next_service.event_date < expected_birth:
            return ABORTED
        return ABORTED if overdue else CONFIRMED
    if next_service is not None:
        return FAILED
    return FAILED if overdue else PENDING
