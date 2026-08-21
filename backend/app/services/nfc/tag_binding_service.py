"""Vínculo entre un animal y su identificación electrónica.

El celular graba el arete, pero el vínculo autoritativo vive aquí. Sin él un
arete arrancado, reutilizado o clonado no se puede auditar, y la finca pierde
la trazabilidad que exige el ICA.

Dos tecnologías distintas conviven y no son intercambiables:

* ``nfc_uid`` — arete NFC de 13.56 MHz (NTAG21x / ICODE). Lo lee y graba
  cualquier celular Android con NFC. Es el que programa la aplicación.
* ``lf_tag_code`` — transpondedor de 134.2 kHz (ISO 11784/11785) del bolo
  ruminal o el inyectable subcutáneo. Ningún celular lo lee: entra por bastón
  lector o digitado. Solo se registra, nunca se graba desde la aplicación.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Optional

from app import db
from app.models.animals import Animals
from app.models.base_model import ValidationError

# Un UID NFC real tiene 4, 7 o 10 bytes (8, 14 o 20 dígitos hex). Se acepta el
# rango completo en vez de las tres longitudes exactas porque algunos aretes
# ganaderos exponen UID no estándar y rechazarlos dejaría al operario sin poder
# registrar un arete que su celular sí lee.
_NFC_UID_PATTERN = re.compile(r"^[0-9A-F]{8,20}$")

# El código ISO 11784 son 15 dígitos: 3 de país/fabricante + 12 de identidad.
_LF_CODE_PATTERN = re.compile(r"^[0-9]{15}$")


class TagConflictError(Exception):
    """El chip ya pertenece a otro animal.

    Lleva el registro del animal que lo tiene para que la interfaz pueda
    preguntarle al operario si de verdad quiere reasignarlo, en vez de mostrar
    un error opaco a mitad del corral.
    """

    def __init__(self, holder_id: int, holder_record: str, code: str):
        self.holder_id = holder_id
        self.holder_record = holder_record
        self.code = code
        super().__init__(
            f"El chip {code} ya está asignado al animal {holder_record}"
        )


def normalize_nfc_uid(raw: str) -> str:
    """Normaliza el UID a hexadecimal continuo en mayúsculas.

    Cada lector escribe el mismo UID distinto (``04:a2:24``, ``04 a2 24``,
    ``04-A2-24``). Sin normalizar, el mismo arete entraría dos veces.
    """
    if not raw or not isinstance(raw, str):
        raise ValidationError(
            "El UID del arete NFC es obligatorio",
            field="nfc_uid",
            errors={"nfc_uid": "El UID del arete NFC es obligatorio"},
        )

    cleaned = re.sub(r"[\s:\-]", "", raw).upper()
    if not _NFC_UID_PATTERN.match(cleaned):
        detail = (
            "El UID debe ser hexadecimal de 8 a 20 dígitos (4, 7 o 10 bytes). "
            f"Se recibió: {len(cleaned)} caracteres"
        )
        raise ValidationError(detail, field="nfc_uid", errors={"nfc_uid": detail})
    return cleaned


def normalize_lf_code(raw: str) -> str:
    """Normaliza el código ISO 11784 a 15 dígitos sin separadores."""
    if not raw or not isinstance(raw, str):
        detail = "El código del transpondedor es obligatorio"
        raise ValidationError(detail, field="lf_tag_code", errors={"lf_tag_code": detail})

    cleaned = re.sub(r"[\s.\-]", "", raw)
    if not _LF_CODE_PATTERN.match(cleaned):
        detail = (
            "El código ISO 11784 debe tener exactamente 15 dígitos. "
            f"Se recibió: {len(cleaned)}"
        )
        raise ValidationError(detail, field="lf_tag_code", errors={"lf_tag_code": detail})
    return cleaned


def _get_owned_animal(animal_id: int, finca_id: int) -> Animals:
    animal = db.session.get(Animals, animal_id)
    if animal is None or animal.finca_id != finca_id:
        detail = f"El animal {animal_id} no existe en esta finca"
        raise ValidationError(detail, field="animal_id", errors={"animal_id": detail})
    return animal


def _claim_code(column, code: str, animal: Animals, force: bool) -> None:
    """Libera el código de su portador anterior o rechaza el conflicto."""
    holder = db.session.query(Animals).filter(column == code).one_or_none()
    if holder is None or holder.id == animal.id:
        return
    if not force:
        raise TagConflictError(
            holder_id=holder.id, holder_record=holder.record, code=code
        )
    # Reasignación explícita: el arete cambió de animal (recambio, corrección
    # de captura). El portador anterior queda sin identificación electrónica
    # para que el siguiente inventario lo detecte como pendiente.
    setattr(holder, column.key, None)
    if column.key == "nfc_uid":
        holder.nfc_written_at = None


def bind_tag(
    animal_id: int,
    finca_id: int,
    nfc_uid: Optional[str] = None,
    lf_tag_code: Optional[str] = None,
    written_at: Optional[datetime] = None,
    force: bool = False,
    commit: bool = True,
) -> Animals:
    """Vincula un arete NFC y/o un transpondedor LF con el animal.

    Es idempotente: repetir la misma vinculación no falla, porque el operario
    reescanea el mismo arete cuando duda de si la escritura entró.
    """
    if not nfc_uid and not lf_tag_code:
        detail = "Se requiere el UID del arete NFC o el código del transpondedor"
        raise ValidationError(detail, field="nfc_uid", errors={"nfc_uid": detail})

    animal = _get_owned_animal(animal_id, finca_id)

    if nfc_uid:
        uid = normalize_nfc_uid(nfc_uid)
        _claim_code(Animals.nfc_uid, uid, animal, force)
        animal.nfc_uid = uid
        animal.nfc_written_at = written_at or datetime.now(timezone.utc)

    if lf_tag_code:
        code = normalize_lf_code(lf_tag_code)
        _claim_code(Animals.lf_tag_code, code, animal, force)
        animal.lf_tag_code = code

    if commit:
        db.session.commit()
    else:
        db.session.flush()
    return animal


def unbind_tag(animal_id: int, finca_id: int, commit: bool = True) -> Animals:
    """Retira la identificación electrónica del animal.

    Se usa cuando el arete se pierde o el chip se daña: dejar el vínculo vivo
    haría que un arete encontrado en el potrero identificara a un animal que ya
    no lo lleva.
    """
    animal = _get_owned_animal(animal_id, finca_id)
    animal.nfc_uid = None
    animal.nfc_written_at = None
    animal.lf_tag_code = None

    if commit:
        db.session.commit()
    else:
        db.session.flush()
    return animal


def find_by_tag(
    finca_id: int,
    nfc_uid: Optional[str] = None,
    lf_tag_code: Optional[str] = None,
) -> Optional[Animals]:
    """Resuelve el animal a partir del chip leído en el potrero.

    El filtro por finca es obligatorio: un arete de otra finca no debe revelar
    su animal a un operario que no pertenece a ella.
    """
    query = db.session.query(Animals).filter(Animals.finca_id == finca_id)

    if nfc_uid:
        return query.filter(Animals.nfc_uid == normalize_nfc_uid(nfc_uid)).one_or_none()
    if lf_tag_code:
        return query.filter(
            Animals.lf_tag_code == normalize_lf_code(lf_tag_code)
        ).one_or_none()

    detail = "Se requiere un código de chip para la búsqueda"
    raise ValidationError(detail, field="nfc_uid", errors={"nfc_uid": detail})
