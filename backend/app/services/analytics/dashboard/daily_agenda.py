"""What needs attention on the farm today.

Three sources: infrastructure maintenance, paddocks that should be rotated and
tasks already due. The rotation part is the one worth reading: the overgrazing
check runs over the latest survey of every paddock in one query instead of one
query per paddock.
"""

from datetime import date, datetime, timedelta

from sqlalchemy import and_, func

from app import db

# Alturas del aforo, en centímetros: por encima de la de entrada el potrero
# está listo, por debajo de la de salida ya se pasó de pastoreo.
_READY_ENTRY_HEIGHT_CM = 20
_RESTED_EXIT_HEIGHT_CM = 5

# Tareas que se muestran en la agenda; el resto vive en la pantalla de tareas.
_TASKS_SHOWN = 5


def _latest_aforo_per_field(finca_id, field_ids):
    """Último aforo de cada potrero de la finca."""
    from app.models.operational import PastureAforo

    if not field_ids:
        return []

    latest = (
        db.session.query(
            PastureAforo.field_id,
            func.max(PastureAforo.created_at).label("latest_at"),
        )
        .filter(PastureAforo.finca_id == finca_id)
        .group_by(PastureAforo.field_id)
        .subquery()
    )
    return (
        db.session.query(PastureAforo)
        .join(
            latest,
            and_(
                PastureAforo.field_id == latest.c.field_id,
                PastureAforo.created_at == latest.c.latest_at,
            ),
        )
        .all()
    )


def _is_overgrazed(aforo) -> bool:
    """Ni alcanzó la altura de entrada ni bajó de la de salida: hay sobrepastoreo."""
    ready = aforo.entry_height and aforo.entry_height >= _READY_ENTRY_HEIGHT_CM
    rested = aforo.exit_height and aforo.exit_height <= _RESTED_EXIT_HEIGHT_CM
    return not ready and not rested


def _critical_rotations(finca_id) -> list[dict]:
    from app.models.animalFields import AnimalFields
    from app.models.animals import AnimalStatus, Animals
    from app.models.fields import Fields

    fields_by_id = {
        field.id: field for field in Fields.query.filter_by(finca_id=finca_id).all()
    }
    aforos = _latest_aforo_per_field(finca_id, list(fields_by_id))
    critical_ids = [aforo.field_id for aforo in aforos if _is_overgrazed(aforo)]
    if not critical_ids:
        return []

    occupancy = (
        db.session.query(AnimalFields.field_id, func.count(AnimalFields.id))
        .join(Animals, Animals.id == AnimalFields.animal_id)
        .filter(
            AnimalFields.field_id.in_(critical_ids),
            AnimalFields.removal_date.is_(None),
            AnimalFields.is_deleted.is_(False),
            Animals.is_deleted.is_(False),
            Animals.status == AnimalStatus.Vivo,
        )
        .group_by(AnimalFields.field_id)
        .all()
    )

    rotations = []
    for field_id, animal_count in occupancy:
        field = fields_by_id.get(field_id)
        # Un potrero sobrepastoreado sin animales no es una acción de hoy.
        if field and animal_count:
            rotations.append(
                {
                    "field_name": field.name,
                    "animal_count": int(animal_count),
                    "reason": "Sobrepastoreo detectado",
                }
            )
    return rotations


def get_daily_operational_agenda(finca_id) -> dict:
    """Acciones críticas del día."""
    from app.models.tasks import Tasks, TaskStatus
    from app.services.operational_service import OperationalService

    infrastructure = OperationalService.get_maintenance_alerts(finca_id)
    rotations = _critical_rotations(finca_id)
    tasks = (
        Tasks.query.filter(
            Tasks.finca_id == finca_id,
            Tasks.status != TaskStatus.COMPLETED,
            Tasks.due_date <= (datetime.now() + timedelta(days=1)),
        )
        .limit(_TASKS_SHOWN)
        .all()
    )

    return {
        "date": date.today().isoformat(),
        "infrastructure": infrastructure,
        "rotations": rotations,
        "tasks": [task.to_namespace_dict() for task in tasks],
        "total_critical_actions": len(infrastructure) + len(rotations) + len(tasks),
    }
