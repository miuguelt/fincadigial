"""Agenda sanitaria: materialización del calendario KB en tareas.

El calendario sanitario (``kb_calendario``) describe las obligaciones de
vacunación, desparasitación y revisión según edad, sexo y frecuencia. Para que
esas obligaciones no dependan solo de la alerta generada por el motor, esta
rutina las materializa en la agenda operativa (``tasks``) con su fecha límite
calculada a partir de la última aplicación registrada (``vaccinations`` con
``kb_codigo``) o de la edad inicial del animal (primera vez).

Idempotencia: la clave de dedupe es (animal_id, título, due_date) sobre tareas
pendientes; una tarea ya creada para esa fecha no se duplica en la siguiente
ejecución. Las ejecuciones corren con ``g.is_admin`` (tarea Celery).
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta

from app import db

logger = logging.getLogger(__name__)

DEFAULT_HORIZON_DAYS = 30
DEFAULT_PAST_DAYS = 7


def _due_date_for(animal, item, last_vaccination) -> date | None:
    """Fecha de vencimiento de la obligación, o None si no aplica."""

    def _value(value):
        return getattr(value, "value", value)

    # Período de vigencia por edad, referido al nacimiento.
    age_days = (date.today() - animal.birth_date).days if animal.birth_date else None
    if age_days is None:
        return None
    if item.edad_inicio_dias is not None and age_days < item.edad_inicio_dias:
        return None
    if item.edad_fin_dias is not None and age_days > item.edad_fin_dias:
        return None

    if last_vaccination is not None:
        if last_vaccination.next_due_date:
            return last_vaccination.next_due_date
        frecuencia = item.frecuencia_dias or 0
        if frecuencia > 0:
            return last_vaccination.vaccination_date + timedelta(days=frecuencia)
        return None  # aplicación única ya hecha

    # Primera aplicación: vence al alcanzar la edad límite de inicio.
    if item.edad_inicio_dias is not None:
        return animal.birth_date + timedelta(days=item.edad_inicio_dias)
    return None


def materialize_upcoming_tasks(
    finca_id: int,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    past_days: int = DEFAULT_PAST_DAYS,
) -> int:
    """Crea las tareas pendientes del calendario sanitario de una finca."""
    from app.models.animals import AnimalStatus
    from app.models.animals import Animals
    from app.models.knowledge_base import KBCalendario, KBSexo
    from app.models.tasks import TaskPriority, TaskStatus
    from app.models.tasks import Tasks
    from app.models.vaccinations import Vaccinations

    animals = Animals.query.filter(
        Animals.finca_id == finca_id,
        Animals.is_deleted == False,  # noqa: E712
        Animals.status == AnimalStatus.Vivo,
    ).all()
    if not animals:
        return 0

    calendar_items = KBCalendario.query.filter_by(activo=True).all()
    if not calendar_items:
        return 0

    today = date.today()
    created = 0

    def _value(value):
        return getattr(value, "value", value)

    for animal in animals:
        for item in calendar_items:
            sex = _value(item.sexo)
            if sex not in (None, _value(KBSexo.AMBOS), _value(animal.sex)):
                continue

            last_vaccination = (
                Vaccinations.query.filter_by(
                    animal_id=animal.id,
                    kb_codigo=item.codigo,
                    is_deleted=False,
                )
                .order_by(Vaccinations.vaccination_date.desc())
                .first()
            )
            due = _due_date_for(animal, item, last_vaccination)
            if due is None:
                continue

            days_to_due = (due - today).days
            if days_to_due < -past_days or days_to_due > horizon_days:
                continue

            title = f"{item.nombre} ({item.codigo})"
            existing = Tasks.query.filter(
                Tasks.animal_id == animal.id,
                Tasks.title == title,
                Tasks.finca_id == finca_id,
                Tasks.is_deleted == False,  # noqa: E712
                Tasks.due_date == datetime.combine(due, time.min),
                Tasks.status.in_(
                    [
                        _value(TaskStatus.PENDING),
                        _value(TaskStatus.IN_PROGRESS),
                    ]
                ),
            ).first()
            if existing:
                continue

            description = (
                f"{item.descripcion}"
                f"{' | ' + item.producto_sugerido if item.producto_sugerido else ''}"
                f"{' | ' + item.dosis_referencia if item.dosis_referencia else ''}"
                f" | Aplicación: {last_vaccination.vaccination_date if last_vaccination else 'pendiente'}"
            )

            try:
                Tasks.create(
                    title=title,
                    description=description,
                    status=TaskStatus.PENDING,
                    priority=TaskPriority.HIGH,
                    due_date=datetime.combine(due, time.min),
                    animal_id=animal.id,
                    finca_id=finca_id,
                )
                created += 1
            except Exception as exc:  # noqa: BLE001 - una tarea no debe tumbar el resto
                logger.warning(
                    "No fue posible crear la tarea %s para el animal %s: %s",
                    title,
                    animal.id,
                    exc,
                )

    if created:
        logger.info("Calendario sanitario: %s tareas nuevas para finca %s", created, finca_id)
    return created
