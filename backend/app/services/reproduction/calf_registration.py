"""Alta de la cría como animal del hato, con su genealogía resuelta.

El parto deja filas en `offspring`, pero la cría no entra al inventario hasta
que alguien le asigna un arete. Este módulo hace ese paso explícito: el operario
aporta el registro y el sexo, y el sistema deriva del parto todo lo demás —fecha
de nacimiento, madre, padre del servicio que la engendró, raza y abuelos—, que
es justo lo que se capturaba mal cuando el ternero se creaba a mano.
"""

from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.base_model import ValidationError
from app.models.reproduction import Offspring

from .cycle_rules import load_rules
from .pregnancy_resolver import load_timelines, resolve_timeline

#: Peso por defecto cuando el parto no registró el peso al nacer.
DEFAULT_BIRTH_WEIGHT_KG = 30.0


def register_calf(offspring_id: int, finca_id: int, data: dict) -> Animals:
    """Crea el animal correspondiente a una cría y lo enlaza con el parto."""
    calf_row = Offspring.query.filter_by(id=offspring_id, finca_id=finca_id).first()
    if calf_row is None:
        raise ValidationError("La cría indicada no existe en esta finca.", field="id")
    if calf_row.animal_id:
        raise ValidationError(
            "Esta cría ya está registrada como animal del hato.", field="id"
        )
    if not calf_row.alive:
        raise ValidationError(
            "La cría está registrada como muerta: no entra al inventario.", field="id"
        )

    birth = calf_row.birth_event
    dam = birth.animal if birth else None
    if dam is None:
        raise ValidationError(
            "El parto de esta cría no tiene madre registrada.", field="id"
        )

    record = (data.get("record") or "").strip()
    if not record:
        raise ValidationError(
            "Indique el número de registro (arete) de la cría.", field="record"
        )
    if Animals.query.filter_by(record=record, finca_id=finca_id).first():
        raise ValidationError(
            f"Ya existe un animal con el registro {record} en esta finca.",
            field="record",
        )

    sire_id = _sire_for_birth(birth, finca_id)
    calf = Animals(
        record=record,
        sex=_sex(data, calf_row),
        birth_date=birth.event_date,
        weight=_weight(data, calf_row),
        status=AnimalStatus.Vivo,
        finca_id=finca_id,
        breeds_id=data.get("breeds_id") or dam.breeds_id,
        idMother=dam.id,
        idFather=sire_id,
    )
    _inherit_grandparents(calf, dam, sire_id)
    db.session.add(calf)
    db.session.flush()

    calf_row.animal_id = calf.id
    if calf_row.sex is None:
        calf_row.sex = calf.sex
    return calf


def _sex(data: dict, calf_row: Offspring) -> Sex:
    raw = data.get("sex") or calf_row.sex
    if isinstance(raw, Sex):
        return raw
    try:
        return Sex(raw)
    except (ValueError, KeyError):
        raise ValidationError(
            "Indique el sexo de la cría (Hembra o Macho).", field="sex"
        ) from None


def _weight(data: dict, calf_row: Offspring) -> float:
    weight = data.get("weight") or calf_row.birth_weight or DEFAULT_BIRTH_WEIGHT_KG
    if weight <= 0:
        raise ValidationError("El peso al nacer debe ser mayor que cero.", field="weight")
    return float(weight)


def _sire_for_birth(birth, finca_id: int) -> int | None:
    """Padre de la cría: el del parto o, si falta, el del servicio que lo explica."""
    if birth.sire_id:
        return birth.sire_id
    timeline = load_timelines(finca_id).get(birth.animal_id)
    if timeline is None:
        return None
    rules = load_rules(finca_id)
    for unit in resolve_timeline(timeline, rules):
        if unit.birth_event_id == birth.id:
            return unit.sire_id
    return None


def _inherit_grandparents(calf: Animals, dam: Animals, sire_id: int | None) -> None:
    """Copia los abuelos que ya conoce el hato, sin inventar los que faltan."""
    calf.idMotherMother = dam.idMother
    calf.idMotherFather = dam.idFather
    if sire_id is None:
        return
    sire = Animals.query.filter_by(id=sire_id, finca_id=calf.finca_id).first()
    if sire is not None:
        calf.idFatherMother = sire.idMother
        calf.idFatherFather = sire.idFather
