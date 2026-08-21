"""Resumen reproductivo compacto de la finca.

Conserva el contrato histórico que consume la interfaz, pero lo calcula con el
mismo resolutor de unidades de servicio que el panel de indicadores, para que
resumen y panel nunca discrepen sobre cuántas preñeces hay vigentes.
"""

from datetime import date, timedelta

from app.models.animals import Animals, AnimalStatus, Sex
from app.models.reproduction import DiagnosisResult, EventType, ReproductiveEvent

from .cycle_rules import load_rules
from .pregnancy_resolver import CONFIRMED, PENDING, build_service_units, load_timelines

#: Días tras la fecha probable de parto en que la preñez sigue reportándose.
OVERDUE_GRACE_DAYS = 45
#: Horizonte del conteo de partos próximos.
UPCOMING_DAYS = 30


def build_summary(finca_id: int) -> dict:
    """Cifras de cabecera del estado reproductivo del hato."""
    today = date.today()
    rules = load_rules(finca_id)
    timelines = load_timelines(finca_id)
    units = build_service_units(None, finca_id, rules, timelines)

    active = 0
    upcoming = 0
    overdue = 0
    for animal_units in units.values():
        if not animal_units:
            continue
        last = animal_units[-1]
        if last.outcome not in (CONFIRMED, PENDING):
            continue
        days_left = (last.expected_birth_date - today).days
        if days_left >= 0:
            active += 1
            if days_left <= UPCOMING_DAYS:
                upcoming += 1
        elif -days_left < OVERDUE_GRACE_DAYS:
            overdue += 1

    counts = _event_counts(finca_id)
    resolved = [
        unit
        for animal_units in units.values()
        for unit in animal_units
        if unit.outcome != PENDING
    ]
    successful = sum(1 for unit in resolved if unit.is_successful)

    return {
        "total_females": Animals.query.filter_by(
            finca_id=finca_id, sex=Sex.Hembra, status=AnimalStatus.Vivo
        ).count(),
        "total_events": sum(counts.values()),
        "total_inseminations": counts["inseminations"],
        "total_heats": counts["heats"],
        "total_diagnoses": counts["diagnoses"],
        "total_births": counts["births"],
        "total_dry_offs": counts["dry_offs"],
        "active_pregnancies": active,
        "births_next_30_days": upcoming,
        "overdue_births": overdue,
        "conception_rate_pct": (
            round(successful * 100 / len(resolved), 1) if resolved else None
        ),
        "total_alive_offspring": counts["alive"],
        "total_dead_offspring": counts["dead"],
    }


def _event_counts(finca_id: int) -> dict[str, int]:
    """Conteos por tipo de evento y crías registradas, en una sola pasada."""
    events = ReproductiveEvent.query.filter_by(finca_id=finca_id).all()
    counts = {
        "heats": 0,
        "inseminations": 0,
        "diagnoses": 0,
        "births": 0,
        "dry_offs": 0,
        "alive": 0,
        "dead": 0,
    }
    for event in events:
        if event.event_type == EventType.Celo:
            counts["heats"] += 1
        elif event.event_type == EventType.Inseminacion:
            counts["inseminations"] += 1
        elif event.event_type == EventType.Diagnostico:
            counts["diagnoses"] += 1
        elif event.event_type == EventType.Parto:
            counts["births"] += 1
            counts["alive"] += event.alive_count or 0
            counts["dead"] += event.dead_count or 0
        elif event.event_type == EventType.Secado:
            counts["dry_offs"] += 1
    return counts


def pending_diagnoses(finca_id: int) -> int:
    """Diagnósticos registrados como pendientes de resultado."""
    return ReproductiveEvent.query.filter_by(
        finca_id=finca_id,
        event_type=EventType.Diagnostico,
        diagnosis_result=DiagnosisResult.Pendiente,
    ).count()


def next_birth_horizon(finca_id: int, days: int = UPCOMING_DAYS) -> date:
    """Fecha límite del horizonte de partos consultado."""
    return date.today() + timedelta(days=max(1, days))
