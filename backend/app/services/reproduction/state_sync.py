"""Sincronización del estado derivado de un evento reproductivo.

El estado del animal (``is_pregnant``, ``is_lactating``, ``last_calving_date``)
y el ciclo de lactancia son datos *derivados* del historial de eventos. Se
recalculan desde el historial completo en lugar de aplicarse como delta, para
que corregir o borrar un evento deje el hato consistente en vez de congelar el
estado que dejó el último alta.
"""

import logging
from datetime import date, timedelta

from app import db
from app.models.animals import Animals
from app.models.lactation_cycle import LactationCycle, LactationStatus
from app.models.reproduction import DiagnosisResult, EventType, Offspring

from .cycle_rules import CycleRules, load_rules
from .pregnancy_resolver import CONFIRMED, AnimalTimeline, load_timelines, resolve_timeline

logger = logging.getLogger(__name__)

#: Duración máxima de una lactancia sin secado registrado.
MAX_LACTATION_DAYS = 305


def apply_event_effects(event, rules: CycleRules | None = None) -> None:
    """Materializa los registros derivados de un evento y resincroniza el animal."""
    rules = rules or load_rules(event.finca_id)
    if event.event_type == EventType.Diagnostico:
        _backfill_expected_birth(event, rules)
    elif event.event_type == EventType.Parto:
        _sync_offspring_rows(event)
        _open_lactation_cycle(event, rules)
    elif event.event_type == EventType.Secado:
        _close_lactation_cycle(event)
    resync_animal(event.animal_id, event.finca_id, rules)


def revert_event_effects(event, rules: CycleRules | None = None) -> None:
    """Retira los registros derivados de un evento antes de borrarlo o moverlo."""
    if event.event_type == EventType.Parto:
        cycle = LactationCycle.query.filter_by(
            animal_id=event.animal_id,
            finca_id=event.finca_id,
            calving_date=event.event_date,
        ).first()
        if cycle is not None:
            db.session.delete(cycle)


def resync_animal(
    animal_id: int, finca_id: int, rules: CycleRules | None = None
) -> Animals | None:
    """Recalcula el estado reproductivo del animal desde todo su historial."""
    animal = Animals.query.filter_by(id=animal_id, finca_id=finca_id).first()
    if animal is None:
        return None
    rules = rules or load_rules(finca_id)
    timeline = load_timelines(finca_id).get(animal_id) or AnimalTimeline(animal_id)
    today = date.today()

    animal.is_pregnant = _is_pregnant(timeline, rules, today)
    animal.last_calving_date = timeline.last_birth_date
    animal.is_lactating = _is_lactating(animal, timeline, today)
    return animal


def _is_pregnant(timeline: AnimalTimeline, rules: CycleRules, today: date) -> bool:
    """Preñez vigente: confirmada por diagnóstico y aún sin parto ni descarte."""
    units = resolve_timeline(timeline, rules)
    if units and units[-1].outcome == CONFIRMED:
        return True
    return _loose_positive_diagnosis(timeline, rules, today)


def _loose_positive_diagnosis(
    timeline: AnimalTimeline, rules: CycleRules, today: date
) -> bool:
    """Diagnóstico positivo sin servicio registrado (monta natural no anotada)."""
    positives = [
        diagnosis
        for diagnosis in timeline.diagnoses
        if diagnosis.diagnosis_result == DiagnosisResult.Positivo
    ]
    if not positives:
        return False
    last = positives[-1]
    limit = last.event_date + timedelta(days=rules.gestation_days)
    if today > limit:
        return False
    closing = [
        event
        for event in timeline.births
        if event.event_date >= last.event_date
    ] + [
        diagnosis
        for diagnosis in timeline.diagnoses
        if diagnosis.event_date > last.event_date
        and diagnosis.diagnosis_result == DiagnosisResult.Negativo
    ]
    return not closing


def _is_lactating(animal: Animals, timeline: AnimalTimeline, today: date) -> bool:
    """Lactancia vigente según el ciclo abierto o, si no hay, según el parto.

    Un secado registrado después del último parto cierra la lactancia de
    inmediato. Sin secado, un ciclo tampoco puede durar para siempre: pasada la
    duración máxima la vaca deja de contar como lactando aunque el ciclo siga
    abierto, y aparece en la lista de secados pendientes.
    """
    last_birth = timeline.last_birth_date
    if _dry_off_after(timeline, last_birth) is not None:
        return False
    active = LactationCycle.get_active_for_animal(animal.id, animal.finca_id)
    reference = active.calving_date if active is not None else last_birth
    if reference is None:
        return False
    return (today - reference).days <= MAX_LACTATION_DAYS


def _dry_off_after(timeline: AnimalTimeline, last_birth: date | None) -> date | None:
    """Fecha del secado posterior al último parto, si lo hubo."""
    candidates = [
        event.event_date
        for event in timeline.dry_offs
        if last_birth is None or event.event_date > last_birth
    ]
    return max(candidates) if candidates else None


def _close_lactation_cycle(event) -> None:
    """Cierra con fecha real la lactancia que el secado da por terminada."""
    cycle = LactationCycle.get_active_for_animal(event.animal_id, event.finca_id)
    if cycle is None:
        return
    cycle.dry_off_date = event.event_date
    cycle.status = LactationStatus.Dry


def _backfill_expected_birth(event, rules: CycleRules) -> None:
    """Un diagnóstico positivo hereda la fecha probable de parto de su servicio."""
    if event.diagnosis_result != DiagnosisResult.Positivo or event.expected_birth_date:
        return
    timeline = load_timelines(event.finca_id).get(event.animal_id)
    if timeline is None:
        return
    units = resolve_timeline(timeline, rules)
    match = next(
        (unit for unit in units if unit.service_id and unit.diagnosis_date == event.event_date),
        None,
    )
    if match is not None:
        event.expected_birth_date = match.expected_birth_date


def _sync_offspring_rows(event) -> None:
    """Crea las filas de descendencia que declaran los conteos del parto."""
    existing = event.offspring.count()
    declared = (event.alive_count or 0) + (event.dead_count or 0)
    if existing or declared <= 0:
        return
    for index in range(declared):
        db.session.add(
            Offspring(
                birth_event_id=event.id,
                finca_id=event.finca_id,
                alive=index < (event.alive_count or 0),
            )
        )


def _open_lactation_cycle(event, rules: CycleRules) -> None:
    """Cierra la lactancia anterior y abre la que inicia con este parto."""
    existing = LactationCycle.query.filter_by(
        animal_id=event.animal_id,
        finca_id=event.finca_id,
        calving_date=event.event_date,
    ).first()
    if existing is not None:
        return

    previous = LactationCycle.get_active_for_animal(event.animal_id, event.finca_id)
    if previous is not None:
        previous.status = LactationStatus.Completed
        previous.dry_off_date = previous.dry_off_date or event.event_date

    number = (
        LactationCycle.query.filter_by(
            animal_id=event.animal_id, finca_id=event.finca_id
        ).count()
        + 1
    )
    db.session.add(
        LactationCycle(
            animal_id=event.animal_id,
            finca_id=event.finca_id,
            calving_date=event.event_date,
            expected_dry_off_date=event.event_date + timedelta(days=MAX_LACTATION_DAYS),
            lactation_number=number,
            status=LactationStatus.Active,
            notes="Abierta automáticamente por el registro del parto.",
        )
    )
