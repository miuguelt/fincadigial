"""Mantiene al día el estado de los potreros tocados por un movimiento de ganado.

Mover animales cambia tres cosas que las tarjetas de potrero muestran: cuántos
animales hay, si el potrero está ocupado y desde cuándo descansa. Antes solo se
recalculaba el conteo, así que un potrero con ganado adentro seguía anunciando
"Disponible · listo para pastorear".
"""

from datetime import date

from sqlalchemy import func, or_

from app import db
from app.models.animalFields import AnimalFields
from app.models.animals import Animals, AnimalStatus
from app.models.fields import Fields, LandStatus

# Estados que el movimiento de ganado puede alternar por su cuenta.
# Mantenimiento, Restringido y Dañado los pone una persona por un motivo que el
# traslado no conoce, así que se respetan.
AUTOMATIC_STATES = frozenset(
    {LandStatus.Disponible, LandStatus.Ocupado, LandStatus.Activo}
)


def live_animal_counts(field_ids: list[int]) -> dict[int, int]:
    """Animales vivos con asignación vigente, por potrero."""
    if not field_ids:
        return {}

    rows = (
        db.session.query(AnimalFields.field_id, func.count(AnimalFields.id))
        .join(Animals, AnimalFields.animal_id == Animals.id)
        .filter(
            AnimalFields.field_id.in_(field_ids),
            AnimalFields.removal_date.is_(None),
            AnimalFields.is_deleted == False,  # noqa: E712 - filtro SQL, no comparación Python
            Animals.is_deleted == False,  # noqa: E712
            Animals.status == AnimalStatus.Vivo,
        )
        .group_by(AnimalFields.field_id)
        .all()
    )
    return {field_id: int(count) for field_id, count in rows}


def _had_livestock_on(field_id: int, on_date: date) -> bool:
    """¿Hubo ganado en ese potrero ese día? Marca el último pastoreo.

    Cubre tanto al potrero que recibe (asignación abierta ese día) como al que
    entrega (asignación cerrada ese mismo día): en ambos casos el potrero fue
    pastoreado y su descanso se cuenta desde entonces.
    """
    return db.session.query(
        db.session.query(AnimalFields.id)
        .filter(
            AnimalFields.field_id == field_id,
            AnimalFields.is_deleted == False,  # noqa: E712
            AnimalFields.assignment_date <= on_date,
            or_(
                AnimalFields.removal_date.is_(None),
                AnimalFields.removal_date >= on_date,
            ),
        )
        .exists()
    ).scalar()


def _summary(field: Fields, animal_count: int) -> dict:
    """Datos que la tarjeta del potrero necesita para repintarse sin recargar."""
    field._prefetched_animal_count = animal_count
    return {
        "id": field.id,
        "name": field.name,
        "animal_count": animal_count,
        "state": field.state.value if field.state else None,
        "last_grazing_date": field.last_grazing_date.isoformat()
        if field.last_grazing_date
        else None,
        "is_grazing_ready": field.is_grazing_ready,
        "rest_days_remaining": field.rest_days_remaining,
        "capacity_num": field.capacity_num,
        "occupancy_rate": field.occupancy_rate,
    }


def sync_field_occupancy(field_ids, on_date: date, finca_id: int) -> list[dict]:
    """Recalcula ocupación, estado y último pastoreo de los potreros indicados.

    Devuelve un resumen por potrero para que la respuesta del traslado ya traiga
    los números nuevos y la interfaz no dependa de un refetch posterior.
    """
    ids = sorted({int(field_id) for field_id in field_ids if field_id})
    if not ids:
        return []

    fields = Fields.query.filter(
        Fields.id.in_(ids),
        Fields.finca_id == finca_id,
        Fields.is_deleted == False,  # noqa: E712
    ).all()
    if not fields:
        return []

    counts = live_animal_counts([field.id for field in fields])

    for field in fields:
        animal_count = counts.get(field.id, 0)

        if field.state in AUTOMATIC_STATES:
            field.state = LandStatus.Ocupado if animal_count else LandStatus.Disponible

        # La fecha no retrocede: un traslado registrado con fecha vieja no puede
        # borrar un pastoreo más reciente.
        if _had_livestock_on(field.id, on_date) and (
            field.last_grazing_date is None or field.last_grazing_date < on_date
        ):
            field.last_grazing_date = on_date

    db.session.flush()
    return [_summary(field, counts.get(field.id, 0)) for field in fields]
