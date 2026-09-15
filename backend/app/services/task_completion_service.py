from datetime import UTC, datetime

from app import db
from app.models.task_completion import TaskCompletionRecord
from app.models.tasks import TaskStatus
from app.utils.activity_logger import log_activity_event
from app.utils.tenant_context import get_current_user_id


class TaskCompletionNotAllowed(ValueError):
    """La tarea no está en un estado que admita cumplimiento."""


def ensure_task_completion(task, *, notes=None, completed_by=None):
    """Crea o actualiza la única evidencia de cumplimiento de una tarea."""
    if task.status == TaskStatus.CANCELLED:
        raise TaskCompletionNotAllowed(
            "Una tarea cancelada no puede marcarse como completada."
        )

    actor_id = completed_by if completed_by is not None else get_current_user_id()
    # Bloquea la tarea padre antes de buscar la evidencia. En PostgreSQL evita
    # que dos finalizaciones simultáneas vean ambas "cero registros" y
    # compitan por la restricción única.
    db.session.query(task.__class__).filter_by(id=task.id).with_for_update().first()
    record = (
        TaskCompletionRecord.query.filter_by(task_id=task.id)
        .with_for_update()
        .first()
    )
    now = datetime.now(UTC)

    if record is None:
        record = TaskCompletionRecord(
            task_id=task.id,
            finca_id=task.finca_id,
            completed_by=actor_id,
            completed_at=now,
            notes=notes,
        )
        db.session.add(record)
    else:
        record.is_deleted = False
        record.finca_id = task.finca_id
        record.completed_at = now
        if actor_id is not None:
            record.completed_by = actor_id
        if notes is not None:
            record.notes = notes

    db.session.flush()
    return record


def log_task_completion(task, completion):
    """Registra el evento auditable sin crear una segunda evidencia."""
    log_activity_event(
        action="complete",
        entity="tasks",
        entity_id=task.id,
        title=f"Tarea completada: {task.title}",
        description=f"Registro de cumplimiento #{completion.id} guardado.",
        relations={
            "task_id": task.id,
            "completion_record_id": completion.id,
            "finca_id": task.finca_id,
        },
        actor_id=completion.completed_by,
        finca_id=task.finca_id,
    )
