"""Bitácora unificada: espejo de eventos de negocio en ``animal_health_history``.

``animal_health_history`` es la línea de tiempo única del animal. Cada evento de
negocio (control, vacunación, tratamiento, episodio de enfermedad, revisión
reproductiva, producción de leche, condición corporal, movimiento ICA) espeja
una fila con ``event_type``, ``reference_kind`` + ``reference_id`` para poder
ubicar su origen y mantener el espejo sincronizado (update/delete/restore).

Los escritores (los modelos) deben llamar estas funciones dentro de la
transacción del evento y hacer commit una sola vez; el upsert/drop es
incremental y no commit como responsabilidad propia.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def _resolve_event_type(event_type: Any) -> Any:
    """Convierte str/enum al valor de ``HealthEventType`` si viene como texto."""
    from app.models.animal_health_history import HealthEventType

    if isinstance(event_type, HealthEventType):
        return event_type
    return HealthEventType(event_type)


def _find_wall(event_type: Any, reference_kind: str, reference_id: int | None):
    """Devuelve la fila espejo más reciente para el origen dado."""
    from app.models.animal_health_history import AnimalHealthHistory

    query = AnimalHealthHistory.query.filter_by(
        event_type=_resolve_event_type(event_type),
        reference_id=reference_id,
    )
    # Filas legadas (antes de reference_kind) se tratan como el mismo origen.
    query = query.filter(
        (AnimalHealthHistory.reference_kind == reference_kind)
        | (AnimalHealthHistory.reference_kind.is_(None))
    )
    return query.order_by(AnimalHealthHistory.id.desc()).first()


def upsert_event(
    *,
    event_type: Any,
    reference_kind: str,
    reference_id: int | None,
    animal_id: int,
    finca_id: int,
    event_date: Any,
    weight: float | None = None,
    height: float | None = None,
    temperature: float | None = None,
    health_status: str | None = None,
    description: str | None = None,
    performed_by: int | None = None,
) -> None:
    """Crea o actualiza la fila espejo del evento en la bitácora unificada."""
    from app.models.animal_health_history import AnimalHealthHistory

    if reference_id is None or animal_id is None:
        logger.debug(
            "upsert_event omitido: reference_id=%s animal_id=%s",
            reference_id,
            animal_id,
        )
        return

    real_type = _resolve_event_type(event_type)
    wall = _find_wall(real_type, reference_kind, reference_id)

    payload = {
        "animal_id": animal_id,
        "finca_id": finca_id,
        "event_type": real_type,
        "event_date": event_date,
        "weight": weight,
        "height": height,
        "temperature": temperature,
        "health_status": health_status,
        "description": description,
        "performed_by": performed_by,
        "reference_id": reference_id,
        "reference_kind": reference_kind,
    }

    if wall:
        if wall.is_deleted:
            wall.is_deleted = False
            wall.deleted_at = None
        for key, value in payload.items():
            setattr(wall, key, value)
        wall.save(commit=False)
    else:
        AnimalHealthHistory.create(commit=False, **payload)


def drop_event(event_type: Any, reference_kind: str, reference_id: int | None) -> None:
    """Retira el espejo de la bitácora (el evento de origen dejó de existir)."""
    from app.models.animal_health_history import AnimalHealthHistory

    if reference_id is None:
        return
    query = AnimalHealthHistory.query.filter_by(
        event_type=_resolve_event_type(event_type),
        reference_id=reference_id,
    )
    query = query.filter(
        (AnimalHealthHistory.reference_kind == reference_kind)
        | (AnimalHealthHistory.reference_kind.is_(None))
    )
    query.delete(synchronize_session=False)
