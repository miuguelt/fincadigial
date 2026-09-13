"""Identidad local y transferencias consentidas de animales.

Esta capa resuelve el caso de uso de compra/venta dentro de Villa Luz sin
pretender sustituir la verificación oficial del ICA.  El animal sigue siendo
una única fila: al aprobarse una transferencia cambia su finca actual y se
conservan todos sus eventos históricos.
"""

from __future__ import annotations

import enum
import hashlib
import secrets
import unicodedata
from datetime import date, datetime, UTC
from typing import Any

from app import db


class AnimalIdentityStatus(enum.Enum):
    """Estado de la identidad oficial/local del animal."""

    PROVISIONAL = "PROVISIONAL"
    UNVERIFIED = "UNVERIFIED"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    REVOKED = "REVOKED"


class TransferStatus(enum.Enum):
    OPEN = "OPEN"
    ACCEPTED = "ACCEPTED"
    CANCELLED = "CANCELLED"
    EXPIRED = "EXPIRED"


class TransferClaimStatus(enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


def normalize_identity_value(value: Any) -> str:
    """Normaliza datos estables para comparar el mismo animal.

    No se usa peso ni precio porque cambian con el tiempo.  El código de
    transferencia se almacena solamente como hash y nunca se persiste en
    claro.
    """

    text = "" if value is None else str(value)
    text = unicodedata.normalize("NFKC", text).strip().casefold()
    return " ".join(text.split())


def build_identity_fingerprint(
    *,
    record: Any,
    birth_date: Any,
    sex: Any,
    breeds_id: Any,
    nfc_uid: Any = None,
    lf_tag_code: Any = None,
) -> str:
    """Construye una huella determinista de atributos que caracterizan al animal."""

    sex_value = getattr(sex, "value", sex)
    birth_value = birth_date.isoformat() if hasattr(birth_date, "isoformat") else birth_date
    values = (
        normalize_identity_value(record),
        normalize_identity_value(birth_value),
        normalize_identity_value(sex_value),
        normalize_identity_value(breeds_id),
        normalize_identity_value(nfc_uid),
        normalize_identity_value(lf_tag_code),
    )
    return hashlib.sha256("|".join(values).encode("utf-8")).hexdigest()


def hash_transfer_code(code: str) -> str:
    return hashlib.sha256(normalize_identity_value(code).encode("utf-8")).hexdigest()


def generate_transfer_code() -> str:
    """Código corto que el vendedor puede compartir de forma segura."""

    # token_urlsafe puede incluir '-'/'_'; se mantienen para conservar entropía.
    return f"VL-{secrets.token_urlsafe(9).upper()}"


class AnimalIdentity(db.Model):
    """Identidad local/oficial separada del registro de una finca."""

    __tablename__ = "animal_identities"
    __table_args__ = (
        db.Index("ix_animal_identity_status", "status"),
        db.Index("ix_animal_identity_animal", "animal_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    animal_id = db.Column(
        db.Integer, db.ForeignKey("animals.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    # CII/DIN se incorpora cuando exista una verificación oficial. Nullable es
    # intencional para crías y registros locales pendientes.
    official_code = db.Column(db.String(80), nullable=True, unique=True)
    official_system = db.Column(db.String(40), nullable=True)
    status = db.Column(
        db.Enum(AnimalIdentityStatus, native_enum=False, length=20),
        nullable=False,
        default=AnimalIdentityStatus.PROVISIONAL,
    )
    origin_type = db.Column(db.String(30), nullable=False, default="LOCAL")
    identification_due_at = db.Column(db.Date, nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    last_checked_at = db.Column(db.DateTime, nullable=True)
    verification_reference = db.Column(db.String(255), nullable=True)
    evidence_hash = db.Column(db.String(128), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(UTC))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    animal = db.relationship("Animals", back_populates="identity")

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "animal_id": self.animal_id,
            "official_code": self.official_code,
            "official_system": self.official_system,
            "status": self.status.value if self.status else None,
            "origin_type": self.origin_type,
            "identification_due_at": self.identification_due_at.isoformat()
            if self.identification_due_at
            else None,
            "verified_at": self.verified_at.isoformat() if self.verified_at else None,
            "last_checked_at": self.last_checked_at.isoformat()
            if self.last_checked_at
            else None,
        }


class AnimalTransfer(db.Model):
    """Intención de venta generada por la finca que entrega el animal."""

    __tablename__ = "animal_transfers"
    __table_args__ = (
        db.Index("ix_animal_transfer_animal_status", "animal_id", "status"),
        db.Index("ix_animal_transfer_origin", "origin_finca_id"),
        db.Index("ix_animal_transfer_fingerprint", "fingerprint_hash"),
        db.Index("ix_animal_transfer_code_hash", "claim_code_hash"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    animal_id = db.Column(
        db.Integer, db.ForeignKey("animals.id", ondelete="CASCADE"), nullable=False
    )
    origin_finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id", ondelete="RESTRICT"), nullable=False
    )
    destination_finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id", ondelete="RESTRICT"), nullable=True
    )
    seller_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    status = db.Column(
        db.Enum(TransferStatus, native_enum=False, length=20),
        nullable=False,
        default=TransferStatus.OPEN,
    )
    fingerprint_hash = db.Column(db.String(64), nullable=False)
    claim_code_hash = db.Column(db.String(64), nullable=False, unique=True)
    original_record = db.Column(db.String(255), nullable=False)
    sale_date = db.Column(db.Date, nullable=False, default=date.today)
    buyer_name = db.Column(db.String(150), nullable=True)
    notes = db.Column(db.String(500), nullable=True)
    expires_at = db.Column(db.DateTime, nullable=True)
    accepted_at = db.Column(db.DateTime, nullable=True)
    accepted_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(UTC))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    animal = db.relationship("Animals", backref=db.backref("transfers", lazy="selectin"))
    origin_finca = db.relationship("Finca", foreign_keys=[origin_finca_id], lazy="selectin")
    destination_finca = db.relationship(
        "Finca", foreign_keys=[destination_finca_id], lazy="selectin"
    )
    seller = db.relationship("User", foreign_keys=[seller_user_id], lazy="selectin")
    accepter = db.relationship("User", foreign_keys=[accepted_by], lazy="selectin")

    def is_open(self) -> bool:
        if self.status != TransferStatus.OPEN:
            return False
        if self.expires_at is None:
            return True
        expires_at = self.expires_at
        # Algunos drivers devuelven DateTime sin tzinfo aunque se haya
        # persistido UTC; normalizamos antes de comparar para evitar TypeError.
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        return datetime.now(UTC) < expires_at

    def to_dict(self, include_secret: bool = False) -> dict[str, Any]:
        result = {
            "id": self.id,
            "animal_id": self.animal_id,
            "origin_finca_id": self.origin_finca_id,
            "destination_finca_id": self.destination_finca_id,
            "status": self.status.value if self.status else None,
            "original_record": self.original_record,
            "sale_date": self.sale_date.isoformat() if self.sale_date else None,
            "buyer_name": self.buyer_name,
            "notes": self.notes,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "accepted_at": self.accepted_at.isoformat() if self.accepted_at else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
        if include_secret:
            result["claim_code"] = getattr(self, "_claim_code", None)
        return result


class AnimalTransferClaim(db.Model):
    """Solicitud del comprador para que el propietario original autorice la unión."""

    __tablename__ = "animal_transfer_claims"
    __table_args__ = (
        db.Index("ix_animal_claim_transfer_status", "transfer_id", "status"),
        db.Index("ix_animal_claim_user", "claimant_user_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    transfer_id = db.Column(
        db.Integer, db.ForeignKey("animal_transfers.id", ondelete="CASCADE"), nullable=False
    )
    claimant_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    destination_finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id", ondelete="RESTRICT"), nullable=False
    )
    status = db.Column(
        db.Enum(TransferClaimStatus, native_enum=False, length=20),
        nullable=False,
        default=TransferClaimStatus.PENDING,
    )
    requested_history = db.Column(db.Boolean, nullable=False, default=True)
    submitted_record = db.Column(db.String(255), nullable=False)
    submitted_birth_date = db.Column(db.Date, nullable=False)
    submitted_sex = db.Column(db.String(20), nullable=False)
    submitted_breeds_id = db.Column(db.Integer, nullable=False)
    fingerprint_hash = db.Column(db.String(64), nullable=False)
    submitted_data = db.Column(db.JSON, nullable=True)
    decision_note = db.Column(db.String(500), nullable=True)
    decided_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    decided_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(UTC))
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    transfer = db.relationship(
        "AnimalTransfer", backref=db.backref("claims", lazy="selectin"), lazy="selectin"
    )
    claimant = db.relationship("User", foreign_keys=[claimant_user_id], lazy="selectin")
    destination_finca = db.relationship("Finca", lazy="selectin")
    decider = db.relationship("User", foreign_keys=[decided_by], lazy="selectin")

    def to_notification_dict(self) -> dict[str, Any]:
        transfer = self.transfer
        return {
            "id": -self.id,
            "type": "ANIMAL_TRANSFER_REQUEST",
            "finca_id": transfer.origin_finca_id if transfer else None,
            "finca_name": transfer.origin_finca.name if transfer and transfer.origin_finca else None,
            "sender_id": self.claimant_user_id,
            "sender_name": self.claimant.fullname if self.claimant else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "status": self.status.value.lower() if self.status else "pending",
            "metadata": {
                "claim_id": self.id,
                "transfer_id": self.transfer_id,
                "animal_id": transfer.animal_id if transfer else None,
                "record": self.submitted_record,
                "birth_date": self.submitted_birth_date.isoformat()
                if self.submitted_birth_date
                else None,
                "sex": self.submitted_sex,
                "breeds_id": self.submitted_breeds_id,
                "nfc_uid": (self.submitted_data or {}).get("nfc_uid"),
                "lf_tag_code": (self.submitted_data or {}).get("lf_tag_code"),
                "destination_finca_id": self.destination_finca_id,
                "destination_finca_name": self.destination_finca.name
                if self.destination_finca
                else None,
                "requested_history": self.requested_history,
                "decision_note": self.decision_note,
            },
        }
