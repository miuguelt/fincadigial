"""Eventos futuros del calendario global: qué queda por hacer, no qué se hizo.

El calendario sólo proyectaba registros ya ocurridos (vacunaciones aplicadas,
tratamientos administrados, controles hechos). Las tres fuentes de este módulo
son las que responden la pregunta operativa: qué vacuna toca, hasta cuándo dura
un periodo de retiro y qué tareas vencen.
"""

from datetime import date

from app.models.tasks import Tasks, TaskStatus
from app.models.treatments import Treatments
from app.models.vaccinations import Vaccinations

CLOSED_TASK_STATUSES = (TaskStatus.COMPLETED, TaskStatus.CANCELLED)


def _vaccine_due_events(tenant_filter, start_date: date, end_date: date) -> list[dict]:
    """Próximas dosis programadas (Vaccinations.next_due_date)."""
    pending = (
        tenant_filter(Vaccinations.query, Vaccinations)
        .filter(
            Vaccinations.next_due_date.isnot(None),
            Vaccinations.next_due_date >= start_date,
            Vaccinations.next_due_date <= end_date,
        )
        .all()
    )

    return [
        {
            "id": f"vacc_due_{v.id}",
            "title": f"PRÓX VAC: {v.vaccines.name if v.vaccines else 'Vacuna'} - {v.animals.record if v.animals else '???'}",
            "start": str(v.next_due_date),
            "type": "vaccine_due",
            "color": "#a855f7",  # purple
            "animal_id": v.animal_id,
            "description": f"Próxima dosis programada: {v.vaccines.name if v.vaccines else ''}",
        }
        for v in pending
    ]


def _withdrawal_end_events(
    tenant_filter, start_date: date, end_date: date
) -> list[dict]:
    """Fin del periodo de retiro: hasta esa fecha no se comercializa."""
    ending = (
        tenant_filter(Treatments.query, Treatments)
        .filter(
            Treatments.withdrawal_end_date.isnot(None),
            Treatments.withdrawal_end_date >= start_date,
            Treatments.withdrawal_end_date <= end_date,
        )
        .all()
    )

    return [
        {
            "id": f"withdrawal_{t.id}",
            "title": f"FIN RETIRO: {t.animals.record if t.animals else '???'}",
            "start": str(t.withdrawal_end_date),
            "type": "withdrawal_end",
            "color": "#f97316",  # orange
            "animal_id": t.animal_id,
            "description": f"Fin del periodo de retiro ({t.withdrawal_days or 0} días): {t.description or ''}",
        }
        for t in ending
    ]


def _task_events(tenant_filter, start_date: date, end_date: date) -> list[dict]:
    """Tareas con vencimiento en el rango, excluidas las ya cerradas."""
    tasks = (
        tenant_filter(Tasks.query, Tasks)
        .filter(
            Tasks.due_date.isnot(None),
            Tasks.due_date >= start_date,
            Tasks.due_date <= end_date,
            Tasks.status.notin_(CLOSED_TASK_STATUSES),
        )
        .all()
    )

    return [
        {
            "id": f"task_{t.id}",
            "title": f"TAREA: {t.title}",
            "start": t.due_date.date().isoformat(),
            "type": "task",
            "color": "#0ea5e9",  # sky
            "animal_id": getattr(t, "animal_id", None),
            "description": t.description or t.title,
        }
        for t in tasks
    ]


def build_future_events(tenant_filter, start_date: date, end_date: date) -> list[dict]:
    """Reúne los eventos pendientes del rango en el formato del calendario."""
    return (
        _vaccine_due_events(tenant_filter, start_date, end_date)
        + _withdrawal_end_events(tenant_filter, start_date, end_date)
        + _task_events(tenant_filter, start_date, end_date)
    )
