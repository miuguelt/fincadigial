"""Reglas de dominio para registrar eventos reproductivos.

Distingue lo imposible de lo improbable: lo imposible se rechaza con un mensaje
accionable, lo improbable vuelve como advertencia para que el operario lo
confirme sin bloquear el registro en campo.
"""

from datetime import date, timedelta

from app.models.animals import Animals, Sex
from app.models.base_model import ValidationError
from app.models.reproduction import EventType, ReproductiveEvent

from .cycle_rules import CycleRules, load_rules
from .female_metrics import DAYS_PER_MONTH

#: Intervalo mínimo entre dos partos de la misma hembra.
MIN_CALVING_INTERVAL_DAYS = 240


def validate_event(
    data: dict, finca_id: int, event_id: int | None = None, rules: CycleRules | None = None
) -> list[str]:
    """Valida un evento reproductivo y devuelve las advertencias detectadas."""
    rules = rules or load_rules(finca_id)
    today = date.today()
    event_type = _event_type(data.get("event_type"))
    event_date = _event_date(data.get("event_date"), today)

    animal = _require_female(data.get("animal_id"), finca_id)
    _require_sire(data.get("sire_id"), finca_id)
    if animal.birth_date and event_date < animal.birth_date:
        raise ValidationError(
            f"La fecha del evento ({event_date}) es anterior al nacimiento del animal "
            f"({animal.birth_date}).",
            field="event_date",
        )
    _reject_duplicate(animal.id, event_type, event_date, finca_id, event_id)

    if event_type == EventType.Parto:
        _validate_birth(data, animal, event_date, finca_id, event_id)
    elif event_type == EventType.Secado:
        _validate_dry_off(animal, event_date, finca_id)

    return _warnings(data, animal, event_type, event_date, finca_id, rules, today)


def _event_type(raw) -> EventType:
    if isinstance(raw, EventType):
        return raw
    try:
        return EventType(raw)
    except (ValueError, KeyError):
        raise ValidationError(
            "Tipo de evento inválido. Use Celo, Inseminacion, Diagnostico, Parto "
            "o Secado.",
            field="event_type",
        ) from None


def _event_date(raw, today: date) -> date:
    value = raw
    if isinstance(value, str):
        try:
            value = date.fromisoformat(value)
        except ValueError:
            raise ValidationError(
                "Fecha del evento inválida. Use el formato AAAA-MM-DD.",
                field="event_date",
            ) from None
    if not isinstance(value, date):
        raise ValidationError("La fecha del evento es obligatoria.", field="event_date")
    if value > today:
        raise ValidationError(
            "No se pueden registrar eventos reproductivos con fecha futura.",
            field="event_date",
        )
    return value


def _require_female(animal_id, finca_id: int) -> Animals:
    animal = Animals.query.filter_by(id=animal_id, finca_id=finca_id).first()
    if animal is None:
        raise ValidationError(
            "El animal indicado no existe en esta finca.", field="animal_id"
        )
    if animal.sex != Sex.Hembra:
        raise ValidationError(
            f"El animal {animal.record} es macho: los eventos reproductivos se "
            "registran sobre la hembra. Use el campo Padre para el reproductor.",
            field="animal_id",
        )
    return animal


def _require_sire(sire_id, finca_id: int) -> Animals | None:
    if not sire_id:
        return None
    sire = Animals.query.filter_by(id=sire_id, finca_id=finca_id).first()
    if sire is None:
        raise ValidationError(
            "El reproductor indicado no existe en esta finca.", field="sire_id"
        )
    if sire.sex != Sex.Macho:
        raise ValidationError(
            f"El reproductor {sire.record} está registrado como hembra.",
            field="sire_id",
        )
    return sire


def _reject_duplicate(
    animal_id: int,
    event_type: EventType,
    event_date: date,
    finca_id: int,
    event_id: int | None,
) -> None:
    query = ReproductiveEvent.query.filter_by(
        animal_id=animal_id,
        finca_id=finca_id,
        event_type=event_type,
        event_date=event_date,
    )
    if event_id:
        query = query.filter(ReproductiveEvent.id != event_id)
    if query.first() is not None:
        raise ValidationError(
            f"Ya existe un evento de tipo {event_type.value} para este animal en la "
            f"fecha {event_date}.",
            field="event_date",
        )


def _validate_birth(
    data: dict, animal: Animals, event_date: date, finca_id: int, event_id: int | None
) -> None:
    """Conteos coherentes e intervalo entre partos biológicamente posible."""
    alive = data.get("alive_count") or 0
    dead = data.get("dead_count") or 0
    if alive < 0 or dead < 0:
        raise ValidationError(
            "Los conteos de crías no pueden ser negativos.", field="alive_count"
        )
    if alive + dead == 0:
        raise ValidationError(
            "Registre al menos una cría (viva o muerta) para el parto.",
            field="alive_count",
        )

    query = ReproductiveEvent.query.filter(
        ReproductiveEvent.animal_id == animal.id,
        ReproductiveEvent.finca_id == finca_id,
        ReproductiveEvent.event_type == EventType.Parto,
        ReproductiveEvent.event_date > event_date - timedelta(days=MIN_CALVING_INTERVAL_DAYS),
        ReproductiveEvent.event_date < event_date + timedelta(days=MIN_CALVING_INTERVAL_DAYS),
    )
    if event_id:
        query = query.filter(ReproductiveEvent.id != event_id)
    conflict = query.first()
    if conflict is not None:
        raise ValidationError(
            f"{animal.record} tiene un parto registrado el {conflict.event_date}. "
            f"Dos partos no pueden separarse menos de {MIN_CALVING_INTERVAL_DAYS} días.",
            field="event_date",
        )


def _validate_dry_off(animal: Animals, event_date: date, finca_id: int) -> None:
    """Solo se puede secar una vaca que efectivamente está lactando."""
    from app.models.lactation_cycle import LactationCycle

    cycle = LactationCycle.get_active_for_animal(animal.id, finca_id)
    if cycle is None:
        raise ValidationError(
            f"{animal.record} no tiene una lactancia abierta: registre primero el "
            "parto que la inició.",
            field="animal_id",
        )
    if event_date < cycle.calving_date:
        raise ValidationError(
            f"El secado ({event_date}) es anterior al parto que abrió la lactancia "
            f"({cycle.calving_date}).",
            field="event_date",
        )


def _warnings(
    data: dict,
    animal: Animals,
    event_type: EventType,
    event_date: date,
    finca_id: int,
    rules: CycleRules,
    today: date,
) -> list[str]:
    """Situaciones improbables que el operario debe confirmar."""
    warnings: list[str] = []
    if event_type == EventType.Inseminacion:
        if not data.get("sire_id") and not data.get("technique"):
            warnings.append(
                "Servicio sin reproductor ni técnica: no podrá evaluarse el desempeño "
                "del toro ni comparar montas contra inseminación."
            )
        if animal.birth_date:
            months = (event_date - animal.birth_date).days / DAYS_PER_MONTH
            if months < rules.first_service_age_months:
                warnings.append(
                    f"{animal.record} tiene {months:.0f} meses, por debajo de los "
                    f"{rules.first_service_age_months} meses recomendados para el primer servicio."
                )
        if animal.is_pregnant:
            warnings.append(
                f"{animal.record} figura preñada: verifique el diagnóstico antes de servirla."
            )

    if event_type in (EventType.Parto, EventType.Diagnostico):
        window_start = event_date - timedelta(
            days=rules.gestation_days + rules.birth_window_days
            if event_type == EventType.Parto
            else rules.diagnosis_max_days
        )
        service = ReproductiveEvent.query.filter(
            ReproductiveEvent.animal_id == animal.id,
            ReproductiveEvent.finca_id == finca_id,
            ReproductiveEvent.event_type == EventType.Inseminacion,
            ReproductiveEvent.event_date >= window_start,
            ReproductiveEvent.event_date < event_date,
        ).first()
        if service is None:
            warnings.append(
                f"No hay monta ni inseminación registrada para {animal.record} en la "
                "ventana esperada: el evento no podrá vincularse a un servicio ni "
                "contarse en los indicadores de concepción."
            )
    return warnings
