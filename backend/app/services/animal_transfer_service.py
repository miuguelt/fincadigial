"""Casos de uso seguros para venta, reclamación y continuidad del historial."""

from __future__ import annotations

import logging
from datetime import date, datetime, timedelta, UTC
from typing import Any

from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.animals import Animals, AnimalStatus, Sex
from app.models.animal_movements import AnimalMovement, MovementType
from app.models.animal_transfers import (
    AnimalIdentity,
    AnimalIdentityStatus,
    AnimalTransfer,
    AnimalTransferClaim,
    TransferClaimStatus,
    TransferStatus,
    build_identity_fingerprint,
    generate_transfer_code,
    hash_transfer_code,
    normalize_identity_value,
)
from app.models.finca import Finca
from app.models.user import User
from app.models.user_finca import UserFinca

logger = logging.getLogger(__name__)

MANAGER_ROLES = {"Administrador", "Propietario", "Capataz"}
OWNER_ROLES = {"Administrador", "Propietario"}


class AnimalTransferError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "TRANSFER_ERROR"):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


def _as_int(value: Any) -> int | None:
    try:
        return int(value) if value is not None and value != "" else None
    except (TypeError, ValueError):
        return None


def _as_date(value: Any, field: str = "date") -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value
    try:
        return date.fromisoformat(str(value))
    except (TypeError, ValueError):
        raise AnimalTransferError(
            f"{field} debe tener formato YYYY-MM-DD", 422, "INVALID_DATE"
        ) from None


def _sex_value(value: Any) -> Sex:
    raw = getattr(value, "value", value)
    try:
        return Sex(raw)
    except (TypeError, ValueError):
        raise AnimalTransferError("El sexo del animal no es válido", 422, "INVALID_SEX") from None


class AnimalTransferService:
    """Servicio transaccional; ningún método cambia de finca fuera de aquí."""

    @staticmethod
    def _invalidate_animal_cache() -> None:
        """Evita que una lista cacheada o un cliente SSE vea el estado previo."""
        try:
            from app.utils.namespace_helpers import _cache_clear

            _cache_clear("Animals")
        except Exception:
            logger.debug("No se pudo invalidar la caché de animales", exc_info=True)

    @staticmethod
    def ensure_identity(
        animal: Animals,
        *,
        origin_type: str = "LOCAL",
        due_at: date | None = None,
        status: AnimalIdentityStatus = AnimalIdentityStatus.PROVISIONAL,
    ) -> AnimalIdentity:
        identity = AnimalIdentity.query.filter_by(animal_id=animal.id).first()
        if identity is None:
            identity = AnimalIdentity(
                animal_id=animal.id,
                origin_type=origin_type,
                identification_due_at=due_at,
                status=status,
            )
            db.session.add(identity)
        else:
            if due_at is not None:
                identity.identification_due_at = due_at
            if origin_type:
                identity.origin_type = origin_type
        return identity

    @staticmethod
    def _membership(user_id: int, finca_id: int):
        membership = UserFinca.query.filter_by(
            user_id=user_id, finca_id=finca_id, is_active=True
        ).first()
        if membership:
            return membership
        user = db.session.get(User, user_id)
        if user and user.finca_id == finca_id and getattr(user.role, "value", user.role) in MANAGER_ROLES:
            return user
        raise AnimalTransferError("No tienes acceso a la finca indicada", 403, "FARM_ACCESS_DENIED")

    @classmethod
    def _assert_manager(cls, user_id: int, finca_id: int):
        membership = cls._membership(user_id, finca_id)
        role = getattr(membership, "role", None)
        role = getattr(role, "value", role)
        if role not in MANAGER_ROLES:
            raise AnimalTransferError(
                "Solo un propietario, administrador o capataz puede registrar una venta",
                403,
                "TRANSFER_PERMISSION_DENIED",
            )
        return membership

    @classmethod
    def _assert_owner_or_admin(cls, user_id: int, transfer: AnimalTransfer):
        if transfer.seller_user_id == user_id:
            seller = db.session.get(User, user_id)
            seller_role = getattr(getattr(seller, "role", None), "value", getattr(seller, "role", None))
            if seller_role in OWNER_ROLES:
                return
        membership = cls._membership(user_id, transfer.origin_finca_id)
        role = getattr(membership, "role", None)
        role = getattr(role, "value", role)
        if role not in OWNER_ROLES:
            raise AnimalTransferError("No tienes permiso para decidir esta solicitud", 403, "CLAIM_PERMISSION_DENIED")

    @staticmethod
    def _open_transfer(animal_id: int) -> AnimalTransfer | None:
        transfers = AnimalTransfer.query.filter_by(
            animal_id=animal_id, status=TransferStatus.OPEN
        ).order_by(AnimalTransfer.id.desc()).all()
        for transfer in transfers:
            if transfer.expires_at and datetime.now(UTC) >= transfer.expires_at:
                transfer.status = TransferStatus.EXPIRED
                continue
            return transfer
        return None

    @classmethod
    def mark_sold(
        cls,
        *,
        animal_id: int,
        finca_id: int,
        user_id: int,
        sale_date: Any = None,
        buyer_name: str | None = None,
        destination_finca_id: int | None = None,
        notes: str | None = None,
        expires_days: int = 30,
    ) -> dict[str, Any]:
        """Marca vendido en origen y emite un código privado para reclamarlo."""

        cls._assert_manager(user_id, finca_id)
        when = _as_date(sale_date or date.today(), "sale_date")
        if when > date.today():
            raise AnimalTransferError("La fecha de venta no puede ser futura", 422, "INVALID_SALE_DATE")
        if destination_finca_id is not None:
            destination_finca_id = _as_int(destination_finca_id)
            if destination_finca_id == finca_id:
                raise AnimalTransferError("La finca destino debe ser diferente", 422, "SAME_FARM")
            destination = db.session.get(Finca, destination_finca_id)
            if not destination or not destination.is_active:
                raise AnimalTransferError("La finca destino no existe o está inactiva", 422, "INVALID_DESTINATION")

        # El bloqueo de fila es efectivo en PostgreSQL/MySQL y no rompe SQLite
        # durante pruebas locales.
        animal = (
            db.session.query(Animals)
            .filter(Animals.id == animal_id, Animals.finca_id == finca_id)
            .with_for_update()
            .first()
        )
        if not animal or animal.is_deleted:
            raise AnimalTransferError("Animal no encontrado en la finca activa", 404, "ANIMAL_NOT_FOUND")
        if animal.status != AnimalStatus.Vivo:
            raise AnimalTransferError("Solo se puede vender un animal vivo", 422, "ANIMAL_NOT_SELLABLE")
        identity = AnimalIdentity.query.filter_by(animal_id=animal.id).first()
        if (
            identity
            and identity.status == AnimalIdentityStatus.PROVISIONAL
            and identity.identification_due_at
            and identity.identification_due_at < date.today()
        ):
            raise AnimalTransferError(
                "El animal provisional superó el plazo operativo de identificación",
                423,
                "ANIMAL_IDENTIFICATION_OVERDUE",
            )
        if cls._open_transfer(animal.id):
            raise AnimalTransferError("El animal ya tiene una transferencia pendiente", 409, "TRANSFER_ALREADY_OPEN")

        fingerprint = build_identity_fingerprint(
            record=animal.record,
            birth_date=animal.birth_date,
            sex=animal.sex,
            breeds_id=animal.breeds_id,
            nfc_uid=getattr(animal, "nfc_uid", None),
            lf_tag_code=getattr(animal, "lf_tag_code", None),
        )
        claim_code = generate_transfer_code()
        transfer = AnimalTransfer(
            animal_id=animal.id,
            origin_finca_id=finca_id,
            destination_finca_id=destination_finca_id,
            seller_user_id=user_id,
            fingerprint_hash=fingerprint,
            claim_code_hash=hash_transfer_code(claim_code),
            original_record=animal.record,
            sale_date=when,
            buyer_name=(buyer_name or "").strip()[:150] or None,
            notes=(notes or "").strip()[:500] or None,
            expires_at=datetime.now(UTC) + timedelta(days=max(1, min(int(expires_days or 30), 90))),
        )

        animal.status = AnimalStatus.Vendido
        animal.sale_date = when
        animal.exit_date = when
        animal.exit_reason = f"Venta registrada{f' a {transfer.buyer_name}' if transfer.buyer_name else ''}"
        db.session.add(animal)
        db.session.add(transfer)

        # Deja una trazabilidad de venta sin exponer datos financieros en las
        # respuestas del comprador.
        movement = AnimalMovement.create(
            commit=False,
            animal_id=animal.id,
            finca_origen_id=finca_id,
            finca_destino_id=destination_finca_id,
            tipo_movimiento=MovementType.Traslado_Interno
            if destination_finca_id
            else MovementType.Venta_Traslado_Externo,
            fecha_movimiento=when,
            comprador=transfer.buyer_name,
            notes="Venta pendiente de aceptación de la finca destino",
        )
        db.session.flush()
        transfer._claim_code = claim_code
        db.session.commit()
        cls._invalidate_animal_cache()

        return {
            "registration_status": "SOLD_PENDING_TRANSFER",
            "transfer": transfer.to_dict(include_secret=True),
            "claim_code": claim_code,
            "animal": animal.to_namespace_dict(include_relations=False),
        }

    @classmethod
    def register_or_claim(
        cls, *, user_id: int, finca_id: int, data: dict[str, Any]
    ) -> dict[str, Any]:
        """Registra un animal nuevo o crea una solicitud sobre una venta abierta."""

        cls._membership(user_id, finca_id)
        record = str(data.get("record") or "").strip()
        birth_date = _as_date(data.get("birth_date"), "birth_date")
        if birth_date > date.today():
            raise AnimalTransferError("La fecha de nacimiento no puede ser futura", 422, "INVALID_BIRTH_DATE")
        breeds_id = _as_int(data.get("breeds_id"))
        if not record:
            raise AnimalTransferError("El registro interno es obligatorio", 422, "RECORD_REQUIRED")
        if not breeds_id or breeds_id <= 0:
            raise AnimalTransferError("La raza es obligatoria", 422, "BREED_REQUIRED")
        if data.get("weight") is None:
            raise AnimalTransferError("El peso es obligatorio", 422, "WEIGHT_REQUIRED")
        try:
            weight = float(data.get("weight"))
        except (TypeError, ValueError):
            raise AnimalTransferError("El peso debe ser numérico", 422, "INVALID_WEIGHT") from None
        if weight <= 0 or weight > 2000:
            raise AnimalTransferError("El peso debe estar entre 0 y 2000 kg", 422, "INVALID_WEIGHT")
        sex = _sex_value(data.get("sex"))

        fingerprint = build_identity_fingerprint(
            record=record,
            birth_date=birth_date,
            sex=sex,
            breeds_id=breeds_id,
            nfc_uid=data.get("nfc_uid"),
            lf_tag_code=data.get("lf_tag_code"),
        )
        claim_code = str(data.get("claim_code") or "").strip()

        candidates: list[AnimalTransfer] = []
        if claim_code:
            candidates = AnimalTransfer.query.filter_by(
                claim_code_hash=hash_transfer_code(claim_code), status=TransferStatus.OPEN
            ).with_for_update().all()
            if candidates:
                transfer_animal = candidates[0].animal
                # El código privado es la prueba de continuidad. Permitimos
                # que la finca destino use otro registro local, pero exigimos
                # fecha, sexo, raza y coincidencia de cualquier identificador
                # electrónico ya conocido para evitar apropiaciones por copia.
                if not transfer_animal or not cls._claim_matches_animal(
                    transfer_animal,
                    birth_date=birth_date,
                    sex=sex,
                    breeds_id=breeds_id,
                    nfc_uid=data.get("nfc_uid"),
                    lf_tag_code=data.get("lf_tag_code"),
                ):
                    raise AnimalTransferError(
                        "Los datos del animal no coinciden con el código de transferencia",
                        422,
                        "IDENTITY_MISMATCH",
                    )
        if not candidates:
            candidates = AnimalTransfer.query.filter_by(
                fingerprint_hash=fingerprint, status=TransferStatus.OPEN
            ).with_for_update().all()

        candidates = [candidate for candidate in candidates if candidate.is_open()]
        if len(candidates) > 1:
            raise AnimalTransferError(
                "Los datos coinciden con más de una venta; use el código privado de transferencia",
                409,
                "AMBIGUOUS_IDENTITY",
            )

        if candidates:
            transfer = candidates[0]
            if transfer.origin_finca_id == finca_id:
                raise AnimalTransferError("El animal ya pertenece a esta finca", 409, "SAME_FARM")
            pending = AnimalTransferClaim.query.filter_by(
                transfer_id=transfer.id, status=TransferClaimStatus.PENDING
            ).first()
            if pending:
                if pending.claimant_user_id == user_id and pending.destination_finca_id == finca_id:
                    return {
                        "registration_status": "TRANSFER_PENDING",
                        "claim": pending.to_notification_dict(),
                    }
                raise AnimalTransferError("Esta venta ya tiene una solicitud pendiente", 409, "CLAIM_ALREADY_PENDING")

            claim = AnimalTransferClaim(
                transfer_id=transfer.id,
                claimant_user_id=user_id,
                destination_finca_id=finca_id,
                submitted_record=record,
                submitted_birth_date=birth_date,
                submitted_sex=sex.value,
                submitted_breeds_id=breeds_id,
                fingerprint_hash=fingerprint,
                requested_history=bool(data.get("request_history", True)),
                submitted_data={
                    "record": record,
                    "birth_date": birth_date.isoformat(),
                    "sex": sex.value,
                    "breeds_id": breeds_id,
                    "weight": weight,
                    "nfc_uid": data.get("nfc_uid"),
                    "lf_tag_code": data.get("lf_tag_code"),
                    "idFather": _as_int(data.get("idFather")),
                    "idMother": _as_int(data.get("idMother")),
                },
            )
            db.session.add(claim)
            db.session.commit()
            cls._notify_claim(transfer, claim)
            return {
                "registration_status": "TRANSFER_PENDING",
                "claim": claim.to_notification_dict(),
                "message": "Solicitud enviada al propietario original. El animal se creará al ser aprobada.",
            }

        existing = Animals.query.filter_by(record=record, finca_id=finca_id).first()
        if existing:
            raise AnimalTransferError("Ya existe un animal con ese registro en esta finca", 409, "RECORD_CONFLICT")

        animal = Animals(
            record=record,
            sex=sex,
            birth_date=birth_date,
            weight=weight,
            status=AnimalStatus.Vivo,
            finca_id=finca_id,
            breeds_id=breeds_id,
            idFather=_as_int(data.get("idFather")),
            idMother=_as_int(data.get("idMother")),
            entry_date=_as_date(data.get("entry_date"), "entry_date") if data.get("entry_date") else date.today(),
            purchase_date=_as_date(data.get("purchase_date"), "purchase_date") if data.get("purchase_date") else None,
        )
        animal.qr_code = Animals.generate_qr_code()
        db.session.add(animal)
        db.session.flush()
        identity_status = AnimalIdentityStatus.UNVERIFIED if data.get("official_code") else AnimalIdentityStatus.PROVISIONAL
        identity = cls.ensure_identity(animal, origin_type="PURCHASED", status=identity_status)
        if data.get("official_code"):
            normalized_code = normalize_identity_value(data["official_code"]).upper()
            if AnimalIdentity.query.filter_by(official_code=normalized_code).first():
                db.session.rollback()
                raise AnimalTransferError("El código oficial ya está asociado a otro animal", 409, "OFFICIAL_CODE_CONFLICT")
            # También respetar la tabla SINIGAN local histórica mientras se
            # incorpora el conector oficial; evita dos animales con el mismo
            # arete aunque uno de ellos aún no tenga fila de identidad nueva.
            from app.models.sinigan_registrations import SiniganRegistrations

            if SiniganRegistrations.query.filter_by(arete_sinigan=normalized_code).first():
                db.session.rollback()
                raise AnimalTransferError("El código oficial ya está asociado a otro animal", 409, "OFFICIAL_CODE_CONFLICT")
            identity.official_code = normalized_code
            identity.official_system = "PENDING_ICA_VERIFICATION"
        try:
            db.session.commit()
        except IntegrityError as error:
            db.session.rollback()
            message = str(getattr(error, "orig", error)).lower()
            if "official_code" in message or "animal_identities.official_code" in message:
                raise AnimalTransferError(
                    "El código oficial ya está asociado a otro animal",
                    409,
                    "OFFICIAL_CODE_CONFLICT",
                ) from error
            if "record" in message:
                raise AnimalTransferError(
                    "Ya existe un animal con ese registro en esta finca",
                    409,
                    "RECORD_CONFLICT",
                ) from error
            raise
        try:
            from app.models.livestock_summary import LivestockSummary

            LivestockSummary.get_for_finca(finca_id).recalculate()
            db.session.commit()
        except Exception:
            logger.exception("No se pudo actualizar el resumen ganadero tras registrar animal")

        return {
            "registration_status": "CREATED_LOCAL",
            "animal": animal.to_namespace_dict(include_relations=False),
            "identity": identity.to_dict(),
        }

    @staticmethod
    def _claim_matches_animal(
        animal: Animals,
        *,
        birth_date: date,
        sex: Sex,
        breeds_id: int,
        nfc_uid: Any = None,
        lf_tag_code: Any = None,
    ) -> bool:
        """Compara los atributos físicos/registrales no mutables del animal."""

        if animal.birth_date != birth_date:
            return False
        if getattr(animal.sex, "value", animal.sex) != sex.value:
            return False
        if int(animal.breeds_id or 0) != int(breeds_id):
            return False
        for field, submitted in (("nfc_uid", nfc_uid), ("lf_tag_code", lf_tag_code)):
            stored = normalize_identity_value(getattr(animal, field, None))
            incoming = normalize_identity_value(submitted)
            if stored and incoming and stored != incoming:
                return False
        return True

    @classmethod
    def decide_claim(
        cls, *, claim_id: int, user_id: int, approve: bool, note: str | None = None
    ) -> dict[str, Any]:
        """El propietario acepta/rechaza; aprobar siempre comparte el historial."""

        claim = (
            db.session.query(AnimalTransferClaim)
            .filter(AnimalTransferClaim.id == claim_id)
            .with_for_update()
            .first()
        )
        if not claim:
            raise AnimalTransferError("Solicitud de transferencia no encontrada", 404, "CLAIM_NOT_FOUND")
        transfer = (
            db.session.query(AnimalTransfer)
            .filter(AnimalTransfer.id == claim.transfer_id)
            .with_for_update()
            .first()
        )
        if not transfer:
            raise AnimalTransferError("Transferencia no encontrada", 404, "TRANSFER_NOT_FOUND")
        cls._assert_owner_or_admin(user_id, transfer)

        if claim.status != TransferClaimStatus.PENDING:
            return cls._serialize_decision(claim, transfer)
        if transfer.status != TransferStatus.OPEN or not transfer.is_open():
            # Cerrar la solicitud al primer intento de decisión evita que el
            # feed muestre indefinidamente una transferencia vencida.
            if transfer.status == TransferStatus.OPEN:
                transfer.status = TransferStatus.EXPIRED
            claim.status = TransferClaimStatus.REJECTED
            claim.decided_by = user_id
            claim.decided_at = datetime.now(UTC)
            claim.decision_note = "La solicitud expiró antes de ser decidida"
            db.session.commit()
            cls._notify_decision(claim, approved=False)
            return cls._serialize_decision(claim, transfer)

        if not approve:
            claim.status = TransferClaimStatus.REJECTED
            claim.decided_by = user_id
            claim.decided_at = datetime.now(UTC)
            claim.decision_note = (note or "Solicitud rechazada por el propietario original")[:500]
            db.session.commit()
            cls._notify_decision(claim, approved=False)
            return cls._serialize_decision(claim, transfer)

        animal = (
            db.session.query(Animals)
            .filter(Animals.id == transfer.animal_id)
            .with_for_update()
            .first()
        )
        destination = db.session.get(Finca, claim.destination_finca_id)
        if not animal or animal.status != AnimalStatus.Vendido or animal.finca_id != transfer.origin_finca_id:
            raise AnimalTransferError("El animal ya no está disponible para transferir", 409, "ANIMAL_TRANSFER_CONFLICT")
        if not destination or not destination.is_active:
            raise AnimalTransferError("La finca destino no está activa", 409, "INVALID_DESTINATION")
        if Animals.query.filter(
            Animals.finca_id == destination.id,
            Animals.record == claim.submitted_record,
            Animals.id != animal.id,
        ).first():
            raise AnimalTransferError("El registro ya existe en la finca destino", 409, "DESTINATION_RECORD_CONFLICT")

        old_finca_id = animal.finca_id
        animal.finca_id = destination.id
        # El comprador puede usar un arete/registro local distinto. Se
        # conserva el original en ``AnimalTransfer.original_record`` y la fila
        # del animal (con sus relaciones e historial) sigue siendo la misma.
        animal.record = claim.submitted_record
        animal.status = AnimalStatus.Vivo
        animal.entry_date = date.today()
        animal.purchase_date = date.today()
        db.session.add(animal)

        # El mismo animal conserva sus relaciones y su historial. Este evento
        # registra la aceptación sin duplicar tratamientos ni vacunaciones.
        movement = AnimalMovement.create(
            commit=False,
            animal_id=animal.id,
            finca_origen_id=old_finca_id,
            finca_destino_id=destination.id,
            tipo_movimiento=MovementType.Traslado_Interno,
            fecha_movimiento=date.today(),
            notes="Transferencia aceptada por el propietario original; historial compartido",
        )
        claim.status = TransferClaimStatus.ACCEPTED
        claim.decided_by = user_id
        claim.decided_at = datetime.now(UTC)
        claim.decision_note = (note or "Transferencia aprobada y historial compartido")[:500]
        transfer.status = TransferStatus.ACCEPTED
        transfer.destination_finca_id = destination.id
        transfer.accepted_at = datetime.now(UTC)
        transfer.accepted_by = user_id
        db.session.commit()
        cls._invalidate_animal_cache()

        try:
            from app.models.livestock_summary import LivestockSummary

            LivestockSummary.get_for_finca(old_finca_id).recalculate()
            LivestockSummary.get_for_finca(destination.id).recalculate()
            db.session.commit()
        except Exception:
            logger.exception("No se pudo recalcular resumen tras aceptar transferencia")
        cls._notify_decision(claim, approved=True)
        return cls._serialize_decision(claim, transfer)

    @staticmethod
    def _serialize_decision(claim: AnimalTransferClaim, transfer: AnimalTransfer) -> dict[str, Any]:
        return {
            "registration_status": "TRANSFER_ACCEPTED"
            if claim.status == TransferClaimStatus.ACCEPTED
            else "TRANSFER_REJECTED",
            "claim": claim.to_notification_dict(),
            "animal_id": transfer.animal_id,
            "history_shared": claim.status == TransferClaimStatus.ACCEPTED,
        }

    @classmethod
    def _notify_claim(cls, transfer: AnimalTransfer, claim: AnimalTransferClaim):
        """Notificación persistente (feed) + push/SSE best-effort."""

        try:
            from app.services.push_notification_service import PushNotificationService
            PushNotificationService.send_to_user(
                transfer.seller_user_id,
                "Solicitud de historial de animal",
                f"La finca {claim.destination_finca.name if claim.destination_finca else 'destino'} solicita registrar el animal {claim.submitted_record}. Decide si compartes su historial.",
                data={"type": "animal_transfer_request", "claim_id": claim.id, "url": "/alerts"},
                tag=f"animal-transfer-claim-{claim.id}",
            )
        except Exception:
            logger.warning("No se pudo enviar push de solicitud de animal", exc_info=True)
        try:
            from app.services.event_service import EventService
            EventService.emit_to_user(
                transfer.seller_user_id,
                "animal_transfer_request",
                {"claim_id": claim.id, "animal_id": transfer.animal_id},
            )
        except Exception:
            logger.debug("No se pudo emitir SSE de solicitud de animal", exc_info=True)

    @classmethod
    def _notify_decision(cls, claim: AnimalTransferClaim, approved: bool):
        try:
            from app.services.push_notification_service import PushNotificationService
            PushNotificationService.send_to_user(
                claim.claimant_user_id,
                "Transferencia de animal actualizada",
                "El propietario original aprobó la transferencia y compartió el historial."
                if approved
                else "El propietario original rechazó la solicitud de transferencia.",
                data={"type": "animal_transfer_decision", "claim_id": claim.id, "url": "/admin/animals"},
                tag=f"animal-transfer-decision-{claim.id}",
            )
        except Exception:
            logger.warning("No se pudo enviar push de decisión de transferencia", exc_info=True)
        try:
            from app.services.event_service import EventService

            EventService.emit_to_user(
                claim.claimant_user_id,
                "animal_transfer_decision",
                {
                    "claim_id": claim.id,
                    "animal_id": claim.transfer.animal_id if claim.transfer else None,
                    "approved": approved,
                },
            )
        except Exception:
            logger.debug("No se pudo emitir SSE de decisión de transferencia", exc_info=True)

    @staticmethod
    def claims_for_user(user_id: int) -> list[dict[str, Any]]:
        """Solicitudes que puede decidir el vendedor/propietario del origen."""

        memberships = UserFinca.query.filter_by(user_id=user_id, is_active=True).all()
        owner_fincas = [
            m.finca_id
            for m in memberships
            if getattr(m.role, "value", m.role) in OWNER_ROLES
        ]
        query = AnimalTransferClaim.query.join(AnimalTransfer).filter(
            AnimalTransferClaim.status == TransferClaimStatus.PENDING,
            or_(AnimalTransfer.seller_user_id == user_id, AnimalTransfer.origin_finca_id.in_(owner_fincas or [-1])),
        )
        return [claim.to_notification_dict() for claim in query.order_by(AnimalTransferClaim.created_at.desc()).all()]

    @staticmethod
    def portable_history(*, animal_id: int, user_id: int, finca_id: int, limit: int = 100) -> dict[str, Any]:
        """Historial seguro visible al tenedor actual del animal."""

        # No basta con que el JWT apunte a una finca: la membresía activa evita
        # que un token antiguo o manipulado consulte trazabilidad de otro tenant.
        AnimalTransferService._membership(user_id, finca_id)
        animal = db.session.get(Animals, animal_id)
        if not animal or animal.finca_id != finca_id:
            raise AnimalTransferError("Animal no encontrado en la finca activa", 404, "ANIMAL_NOT_FOUND")
        limit = max(1, min(int(limit or 100), 250))
        from app.models.animal_health_history import AnimalHealthHistory

        health = AnimalHealthHistory.query.filter_by(animal_id=animal_id).order_by(
            AnimalHealthHistory.event_date.desc(), AnimalHealthHistory.id.desc()
        ).limit(limit).all()
        movements = AnimalMovement.query.filter_by(animal_id=animal_id).order_by(
            AnimalMovement.fecha_movimiento.desc(), AnimalMovement.id.desc()
        ).limit(limit).all()
        return {
            "animal_id": animal_id,
            "record": animal.record,
            "history_shared": True,
            "health_events": [
                {
                    "id": item.id,
                    "event_type": getattr(item.event_type, "value", item.event_type),
                    "event_date": item.event_date.isoformat() if item.event_date else None,
                    "weight": item.weight,
                    "height": item.height,
                    "temperature": item.temperature,
                    "health_status": item.health_status,
                    "description": item.description,
                    "finca_id": item.finca_id,
                }
                for item in health
            ],
            "movements": [
                {
                    "id": item.id,
                    "type": getattr(item.tipo_movimiento, "value", item.tipo_movimiento),
                    "date": item.fecha_movimiento.isoformat() if item.fecha_movimiento else None,
                    "origin_finca_id": item.finca_origen_id,
                    "destination_finca_id": item.finca_destino_id,
                    "destination_name": item.finca_destino.name if item.finca_destino else item.finca_destino_externa,
                    "official_guide": item.guia_movilizacion,
                }
                for item in movements
            ],
        }
