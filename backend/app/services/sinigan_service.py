"""Servicio de Trazabilidad e Identificación Oficial SINIGAN (ICA).

Gestiona la validación de formato según la norma ISO 11784 / DIN (15 dígitos numéricos
iniciando con 170) y el formato visual oficial COL-XXX-XXXX, garantizando la
sincronización con AnimalIdentity y los chips RFID del animal.
"""

from datetime import date, datetime, timezone
import re
from typing import Optional, Tuple
import logging

from app import db
from app.models.animals import Animals
from app.models.sinigan_registrations import SiniganRegistrations
from app.models.animal_transfers import AnimalIdentity, AnimalIdentityStatus
from app.services.animal_transfer_service import AnimalTransferService

logger = logging.getLogger(__name__)

# Expresiones regulares para formatos oficiales colombianos
RE_DIN_ISO_11784 = re.compile(r"^170\d{12}$")
RE_DIN_CON_GUION = re.compile(r"^170-(\d{12})$")
RE_VISUAL_COL = re.compile(r"^COL-\d{3,4}-\d{4}$", re.IGNORECASE)
RE_VISUAL_COL_NUM = re.compile(r"^COL-\d{6,10}$", re.IGNORECASE)


class SiniganValidationError(ValueError):
    """Error de formato o datos en el arete SINIGAN."""
    pass


class SiniganConflictError(ValueError):
    """Conflicto de unicidad: el arete ya pertenece a otro animal."""
    pass


class SiniganService:
    """Lógica centralizada para validación y sincronización de aretes SINIGAN."""

    @staticmethod
    def validate_sinigan_code(code: str) -> Tuple[bool, str, Optional[str], Optional[str]]:
        """Valida y normaliza un código de arete SINIGAN.

        Retorna:
            (is_valid, normalized_code, format_type, error_message)
        """
        if not code or not isinstance(code, str):
            return False, "", None, "El código de arete SINIGAN no puede estar vacío."

        clean = code.strip().upper()

        # 1. Caso con guión en DIN: 170-123456789012 -> 170123456789012
        m_guion = RE_DIN_CON_GUION.match(clean)
        if m_guion:
            clean = f"170{m_guion.group(1)}"

        # 2. Formato canónico DIN / ISO 11784 (15 dígitos numéricos empezando por 170)
        if RE_DIN_ISO_11784.match(clean):
            return True, clean, "DIN_ISO_11784", None

        # 3. Formato visual oficial: COL-001-2026 o COL-1234567
        if RE_VISUAL_COL.match(clean) or RE_VISUAL_COL_NUM.match(clean):
            return True, clean, "VISUAL_COL", None

        # Formato no reconocido
        msg = (
            f"El arete SINIGAN '{code}' no cumple con el estándar oficial del ICA. "
            f"Debe ser un código DIN de 15 dígitos numéricos con prefijo país 170 (ej. 170000123456789) "
            f"o un arete visual oficial (ej. COL-001-2026)."
        )
        return False, clean, None, msg

    @classmethod
    def assign_sinigan_to_animal(
        cls,
        animal_id: int,
        arete_sinigan: str,
        finca_id: Optional[int] = None,
        guia_movilizacion: Optional[str] = None,
        fecha_registro: Optional[date] = None,
        predio_origen: Optional[str] = None,
        notes: Optional[str] = None,
        commit: bool = True,
    ) -> Tuple[SiniganRegistrations, AnimalIdentity]:
        """Asigna y sincroniza un arete oficial SINIGAN a un animal."""
        # 1. Obtener y verificar animal
        animal = Animals.query.get(animal_id)
        if not animal or animal.is_deleted:
            raise SiniganValidationError(f"El animal con ID {animal_id} no existe o fue eliminado.")

        if finca_id is not None and animal.finca_id != finca_id:
            raise SiniganValidationError("El animal no pertenece a la finca activa.")

        # 2. Validar formato
        is_valid, normalized_code, format_type, err_msg = cls.validate_sinigan_code(arete_sinigan)
        if not is_valid:
            raise SiniganValidationError(err_msg)

        # 3. Verificar unicidad en SiniganRegistrations
        existing_reg = SiniganRegistrations.query.filter_by(arete_sinigan=normalized_code).first()
        if existing_reg and existing_reg.animal_id != animal.id:
            raise SiniganConflictError(
                f"El arete SINIGAN '{normalized_code}' ya está asignado a otro animal (ID {existing_reg.animal_id})."
            )

        # 4. Verificar unicidad en AnimalIdentity
        existing_ident = AnimalIdentity.query.filter_by(official_code=normalized_code).first()
        if existing_ident and existing_ident.animal_id != animal.id:
            raise SiniganConflictError(
                f"El código oficial '{normalized_code}' ya está registrado en la identidad del animal ID {existing_ident.animal_id}."
            )

        fecha_reg = fecha_registro or date.today()

        # 5. Upsert en SiniganRegistrations
        reg = SiniganRegistrations.query.filter_by(animal_id=animal.id).first()
        if reg:
            reg.arete_sinigan = normalized_code
            reg.fecha_registro = fecha_reg
            if guia_movilizacion:
                reg.guia_movilizacion = guia_movilizacion
            if predio_origen:
                reg.predio_origen = predio_origen
            if notes:
                reg.notes = notes
            db.session.add(reg)
        else:
            reg = SiniganRegistrations(
                finca_id=animal.finca_id,
                animal_id=animal.id,
                arete_sinigan=normalized_code,
                fecha_registro=fecha_reg,
                predio_origen=predio_origen or (animal.finca.name if animal.finca else "Origen"),
                guia_movilizacion=guia_movilizacion,
                notes=notes or "Registro oficial de arete SINIGAN",
            )
            db.session.add(reg)

        # 6. Sincronizar en AnimalIdentity
        identity = AnimalTransferService.ensure_identity(animal, origin_type="LOCAL")
        identity.official_code = normalized_code
        identity.official_system = "SINIGAN"

        now_utc = datetime.now(timezone.utc)
        identity.last_checked_at = now_utc

        if guia_movilizacion:
            identity.status = AnimalIdentityStatus.VERIFIED
            identity.verification_reference = f"GSMI: {guia_movilizacion}"
            identity.verified_at = now_utc
        else:
            # Si no viene amparado en GSMI oficial, queda como UNVERIFIED (registrado en predio)
            identity.status = AnimalIdentityStatus.UNVERIFIED
            identity.verification_reference = "Registro predial directo"

        db.session.add(identity)

        # 7. Si es chip ISO 11784 (15 dígitos), hidratar lf_tag_code del animal si está vacío
        if format_type == "DIN_ISO_11784" and not animal.lf_tag_code:
            animal.lf_tag_code = normalized_code
            db.session.add(animal)

        if commit:
            db.session.commit()

        logger.info(
            "Arete SINIGAN %s sincronizado para animal %s (Finca: %s, Status: %s)",
            normalized_code,
            animal.record,
            animal.finca_id,
            identity.status.value,
        )

        return reg, identity

    @classmethod
    def get_animal_sinigan_details(cls, animal_id: int, finca_id: Optional[int] = None) -> Optional[dict]:
        """Obtiene la información oficial SINIGAN e identidad del animal."""
        animal = Animals.query.get(animal_id)
        if not animal or animal.is_deleted:
            return None

        if finca_id is not None and animal.finca_id != finca_id:
            return None

        reg = SiniganRegistrations.query.filter_by(animal_id=animal.id).first()
        identity = AnimalIdentity.query.filter_by(animal_id=animal.id).first()

        return {
            "animal_id": animal.id,
            "record": animal.record,
            "has_sinigan": reg is not None,
            "arete_sinigan": reg.arete_sinigan if reg else None,
            "fecha_registro": reg.fecha_registro.isoformat() if reg and reg.fecha_registro else None,
            "guia_movilizacion": reg.guia_movilizacion if reg else None,
            "predio_origen": reg.predio_origen if reg else None,
            "identity_status": identity.status.value if identity and identity.status else None,
            "official_system": identity.official_system if identity else None,
            "verification_reference": identity.verification_reference if identity else None,
            "verified_at": identity.verified_at.isoformat() if identity and identity.verified_at else None,
            "lf_tag_code": animal.lf_tag_code,
        }
