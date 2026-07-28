"""
Fuentes de eventos del Calendario Global.

Cada función consulta UN dominio (reproducción, sanidad, vacunas,
controles, tareas, alertas) y devuelve eventos normalizados.
Usado por CalendarService (fachada).
"""
from datetime import date

from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.models.reproduction import ReproductiveEvent
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations
from app.models.control import Control
from app.models.tasks import Tasks, TaskStatus
from app.models.alerts import AnimalAlert, AlertPriority
from app.utils.tenant_context import apply_tenant_filter

# Colores por tipo de evento (contrato con el frontend)
EVENT_COLORS = {
    'reproduction': '#3b82f6',   # blue
    'future_birth': '#10b981',   # emerald
    'health': '#ef4444',         # red
    'vaccination': '#8b5cf6',    # violet
    'vaccine_due': '#f97316',    # orange
    'withdrawal_end': '#14b8a6', # teal
    'control': '#f59e0b',        # amber
    'task': '#64748b',           # slate
    'alert': '#dc2626',          # red-600
}


def animal_record(obj) -> str | None:
    """Record del animal asociado al registro, si existe."""
    animal = getattr(obj, 'animal', None) or getattr(obj, 'animals', None)
    return getattr(animal, 'record', None)


def _base_event(ev_id: str, title: str, start: str, ev_type: str,
                animal_id, record, description: str) -> dict:
    return {
        'id': ev_id,
        'title': title,
        'start': start,
        'type': ev_type,
        'color': EVENT_COLORS[ev_type],
        'animal_id': animal_id,
        'animal_record': record,
        'description': description,
    }


def reproduction_events(start: date, end: date) -> list[dict]:
    rows = apply_tenant_filter(
        ReproductiveEvent.query.options(joinedload(ReproductiveEvent.animal)),
        ReproductiveEvent
    ).filter(
        ReproductiveEvent.event_date >= start,
        ReproductiveEvent.event_date <= end,
    ).all()
    out = []
    for ev in rows:
        rec = animal_record(ev) or '???'
        out.append(_base_event(
            f'repro_{ev.id}', f"RC: {ev.event_type.value} - {rec}",
            str(ev.event_date), 'reproduction', ev.animal_id, rec,
            ev.notes or f"Evento reproductivo: {ev.event_type.value}",
        ))
        if ev.expected_birth_date and start <= ev.expected_birth_date <= end:
            out.append(_base_event(
                f'birth_est_{ev.id}', f"PARTO ESTIMADO: {rec}",
                str(ev.expected_birth_date), 'future_birth', ev.animal_id, rec,
                f"Fecha probable de parto (basado en {ev.event_type.value})",
            ))
    return out


def treatment_events(start: date, end: date) -> list[dict]:
    rows = apply_tenant_filter(
        Treatments.query.options(joinedload(Treatments.animals)),
        Treatments
    ).filter(
        Treatments.treatment_date >= start,
        Treatments.treatment_date <= end,
    ).all()
    out = []
    for t in rows:
        rec = animal_record(t) or '???'
        out.append(_base_event(
            f'treatment_{t.id}', f"TX: {t.description[:20]}... - {rec}",
            str(t.treatment_date), 'health', t.animal_id, rec, t.description,
        ))

    # Fines de retiro dentro del rango (leche/carne vuelve a ser apta)
    withdrawals = apply_tenant_filter(
        Treatments.query.options(joinedload(Treatments.animals)),
        Treatments
    ).filter(
        Treatments.withdrawal_end_date.isnot(None),
        Treatments.withdrawal_end_date >= start,
        Treatments.withdrawal_end_date <= end,
    ).all()
    for t in withdrawals:
        rec = animal_record(t) or '???'
        out.append(_base_event(
            f'withdrawal_{t.id}', f"FIN DE RETIRO: {rec}",
            str(t.withdrawal_end_date), 'withdrawal_end', t.animal_id, rec,
            f"Termina el tiempo de retiro de: {t.description}. "
            "Leche y carne aptas para consumo/venta desde esta fecha.",
        ))
    return out


def vaccination_events(start: date, end: date) -> list[dict]:
    rows = apply_tenant_filter(
        Vaccinations.query.options(joinedload(Vaccinations.animals)),
        Vaccinations
    ).filter(
        Vaccinations.vaccination_date >= start,
        Vaccinations.vaccination_date <= end,
    ).all()
    out = []
    for v in rows:
        rec = animal_record(v) or '???'
        vname = v.vaccines.name if v.vaccines else 'Vacuna'
        out.append(_base_event(
            f'vacc_{v.id}', f"VAC: {vname} - {rec}",
            str(v.vaccination_date), 'vaccination', v.animal_id, rec,
            f"Vacunación: {vname}",
        ))

    # Próximas dosis programadas dentro del rango
    dues = apply_tenant_filter(
        Vaccinations.query.options(joinedload(Vaccinations.animals)),
        Vaccinations
    ).filter(
        Vaccinations.next_due_date.isnot(None),
        Vaccinations.next_due_date >= start,
        Vaccinations.next_due_date <= end,
    ).all()
    for v in dues:
        rec = animal_record(v) or '???'
        vname = v.vaccines.name if v.vaccines else 'Vacuna'
        out.append(_base_event(
            f'vacc_due_{v.id}', f"PRÓXIMA DOSIS: {vname} - {rec}",
            str(v.next_due_date), 'vaccine_due', v.animal_id, rec,
            f"Refuerzo programado de {vname}. Preparar vacuna e insumos.",
        ))
    return out


def control_events(start: date, end: date) -> list[dict]:
    rows = apply_tenant_filter(
        Control.query.options(joinedload(Control.animals)),
        Control
    ).filter(
        Control.checkup_date >= start,
        Control.checkup_date <= end,
    ).all()
    out = []
    for c in rows:
        rec = animal_record(c) or '???'
        out.append(_base_event(
            f'control_{c.id}', f"CTRL: {rec}",
            str(c.checkup_date), 'control', c.animal_id, rec,
            f"Control veterinario. Peso: {c.weight}kg",
        ))
    return out


def task_events(start: date, end: date) -> list[dict]:
    rows = apply_tenant_filter(
        Tasks.query.options(joinedload(Tasks.animal)),
        Tasks
    ).filter(
        Tasks.due_date.isnot(None),
        func.date(Tasks.due_date) >= start,
        func.date(Tasks.due_date) <= end,
        Tasks.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
    ).all()
    out = []
    for t in rows:
        rec = animal_record(t) if t.animal_id else None
        event = _base_event(
            f'task_{t.id}', f"TAREA: {t.title}",
            t.due_date.date().isoformat(), 'task', t.animal_id, rec,
            t.description or f"Tarea operativa ({t.status.value})",
        )
        event['priority'] = t.priority.value if t.priority else None
        out.append(event)
    return out


def alert_events(start: date, end: date) -> list[dict]:
    rows = apply_tenant_filter(
        AnimalAlert.query.options(joinedload(AnimalAlert.animal)),
        AnimalAlert
    ).filter(
        AnimalAlert.priority.in_([AlertPriority.HIGH, AlertPriority.CRITICAL]),
        func.date(AnimalAlert.triggered_at) >= start,
        func.date(AnimalAlert.triggered_at) <= end,
    ).all()
    out = []
    for a in rows:
        rec = animal_record(a) if a.animal_id else None
        event = _base_event(
            f'alert_{a.id}', f"⚠️ {a.message[:30]}...",
            a.triggered_at.date().isoformat(), 'alert', a.animal_id, rec,
            a.message,
        )
        event['priority'] = a.priority.value if a.priority else None
        out.append(event)
    return out
