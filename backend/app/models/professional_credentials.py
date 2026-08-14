"""Credencial profesional autodeclarada del veterinario.

Marco legal (Colombia):
  - Ley 73 de 1985 y Ley 576 de 2000: el ejercicio de la medicina veterinaria
    exige matrícula profesional expedida por COMVEZCOL.
  - Ley 1581 de 2012 y Decreto 1074 de 2015: la recolección exige autorización
    previa, expresa e informada, y conservar prueba de esa autorización
    (consent_version + consent_accepted_at).

Solo se almacenan datos público-profesionales cotejables contra registros
públicos. Nunca se piden copias de documento de identidad, biometría ni datos
sensibles. Villa Luz no acredita ni habilita el ejercicio profesional: la
verificación registra que una persona autorizada cotejó los datos contra el
registro público en una fecha determinada.
"""

from datetime import UTC, date, datetime

from app import db
from app.models.base_model import BaseModel, ValidationError
import enum
import re

# Vigencia de una verificación antes de degradarse a "Por revalidar".
VERIFICATION_VALIDITY_DAYS = 365

# Versión del aviso de privacidad aceptado. Súbela cuando cambie el texto legal:
# el frontend compara y vuelve a pedir la autorización.
CONSENT_VERSION = '2026-08-01'

_CARD_NUMBER_RE = re.compile(r'^[A-Z0-9\-]{4,20}$')
_MIN_GRADUATION_YEAR = 1950


class CredentialTitle(enum.Enum):
    MedicoVeterinario = 'Médico Veterinario'
    MedicoVeterinarioZootecnista = 'Médico Veterinario y Zootecnista'
    Zootecnista = 'Zootecnista'


class CredentialStatus(enum.Enum):
    Autodeclarado = 'Autodeclarado'
    EnRevision = 'En revisión'
    Verificado = 'Verificado'
    Rechazado = 'Rechazado'
    PorRevalidar = 'Por revalidar'


# Cambiar cualquiera de estos campos invalida una verificación previa: alguien
# podría verificarse con datos reales y luego reemplazarlos.
REVERIFY_TRIGGER_FIELDS = frozenset({
    'title',
    'professional_card_number',
    'issuing_authority',
    'card_issued_at',
    'university',
    'graduation_year',
})


class ProfessionalCredential(BaseModel):
    """Acreditación profesional de un usuario con rol Veterinario."""

    __tablename__ = 'professional_credentials'
    __table_args__ = (
        db.Index('ix_professional_credential_user', 'user_id', unique=True),
        db.Index('ix_professional_credential_status', 'status'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)

    # --- Título habilitante (cotejable en COMVEZCOL y SNIES) ---
    title = db.Column(db.Enum(CredentialTitle), nullable=False)
    professional_card_number = db.Column(db.String(20), nullable=False)
    issuing_authority = db.Column(db.String(80), nullable=False, default='COMVEZCOL')
    card_issued_at = db.Column(db.Date, nullable=True)
    university = db.Column(db.String(160), nullable=False)
    graduation_year = db.Column(db.Integer, nullable=True)
    specialization = db.Column(db.String(200), nullable=True)

    # --- Opcionales ---
    ica_registration = db.Column(db.String(60), nullable=True)
    practice_areas = db.Column(db.String(255), nullable=True)
    liability_insurer = db.Column(db.String(120), nullable=True)
    liability_policy_number = db.Column(db.String(60), nullable=True)
    liability_expires_at = db.Column(db.Date, nullable=True)

    # --- Estado y trazabilidad de la verificación ---
    status = db.Column(db.Enum(CredentialStatus), nullable=False, default=CredentialStatus.Autodeclarado)
    verified_by_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    verified_at = db.Column(db.DateTime, nullable=True)
    verification_source = db.Column(db.String(120), nullable=True)
    verification_reference = db.Column(db.String(160), nullable=True)
    verification_expires_at = db.Column(db.Date, nullable=True)
    verification_notes = db.Column(db.String(255), nullable=True)
    rejection_reason = db.Column(db.String(255), nullable=True)

    # --- Prueba de la autorización (Ley 1581 de 2012) ---
    consent_version = db.Column(db.String(20), nullable=False)
    consent_accepted_at = db.Column(db.DateTime, nullable=False)

    user = db.relationship(
        'User',
        foreign_keys=[user_id],
        backref=db.backref('professional_credential', uselist=False),
        lazy='selectin',
    )
    verified_by = db.relationship('User', foreign_keys=[verified_by_id], lazy='selectin')

    _namespace_fields = [
        'id', 'user_id', 'title', 'professional_card_number', 'issuing_authority',
        'card_issued_at', 'university', 'graduation_year', 'specialization',
        'ica_registration', 'practice_areas', 'liability_insurer',
        'liability_policy_number', 'liability_expires_at', 'status',
        'verified_by_id', 'verified_at', 'verification_source',
        'verification_reference', 'verification_expires_at', 'verification_notes',
        'rejection_reason', 'consent_version', 'consent_accepted_at',
        'created_at', 'updated_at',
    ]
    _namespace_relations = {
        'user': {'fields': ['id', 'fullname', 'email', 'role'], 'depth': 1},
        'verified_by': {'fields': ['id', 'fullname'], 'depth': 1},
    }
    _searchable_fields = ['professional_card_number', 'university', 'specialization']
    _filterable_fields = ['status', 'title', 'user_id']
    _sortable_fields = ['id', 'verified_at', 'created_at', 'updated_at']
    _required_fields = ['user_id', 'title', 'professional_card_number', 'university']
    _enum_fields = {'title': CredentialTitle, 'status': CredentialStatus}

    # La credencial cambia poco y se consulta en cada render de perfil.
    _cache_config = {
        'ttl': 300,
        'type': 'private',
        'strategy': 'stale-while-revalidate',
        'max_age': 300,
        'stale_while_revalidate': 120,
    }

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        sanitized = dict(data or {})
        errors = []

        for field in [
            'professional_card_number', 'issuing_authority', 'university',
            'specialization', 'ica_registration', 'practice_areas',
            'liability_insurer', 'liability_policy_number',
        ]:
            if field in sanitized and isinstance(sanitized[field], str):
                sanitized[field] = sanitized[field].strip()

        card_number = sanitized.get('professional_card_number')
        if isinstance(card_number, str) and card_number:
            card_number = re.sub(r'\s+', '', card_number).upper()
            sanitized['professional_card_number'] = card_number
            if not _CARD_NUMBER_RE.match(card_number):
                errors.append(
                    "El número de matrícula debe tener entre 4 y 20 caracteres "
                    "y solo letras, números o guiones"
                )

        graduation_year = sanitized.get('graduation_year')
        if graduation_year is not None and graduation_year != '':
            try:
                graduation_year = int(graduation_year)
                sanitized['graduation_year'] = graduation_year
            except (TypeError, ValueError):
                errors.append("El año de grado debe ser numérico")
                graduation_year = None
            if graduation_year is not None:
                current_year = datetime.now(UTC).year
                if not (_MIN_GRADUATION_YEAR <= graduation_year <= current_year):
                    errors.append(
                        f"El año de grado debe estar entre {_MIN_GRADUATION_YEAR} y {current_year}"
                    )

        # La normalización str -> date la hace BaseModel; aquí solo se valida el
        # rango cuando el valor ya llegó como date.
        card_issued_at = sanitized.get('card_issued_at')
        if isinstance(card_issued_at, date) and card_issued_at > date.today():
            errors.append("La fecha de expedición de la matrícula no puede ser futura")

        if not is_update and not sanitized.get('consent_accepted_at'):
            errors.append(
                "Debes autorizar el tratamiento de tus datos profesionales para continuar"
            )

        if errors:
            raise ValidationError('; '.join(errors), errors=errors)

        return super()._validate_and_normalize(sanitized, is_update=is_update, instance_id=instance_id)

    @property
    def effective_status(self) -> CredentialStatus:
        """Estado real, degradando las verificaciones vencidas.

        La caducidad se calcula en lectura: un job nocturno dejaría ventanas en
        las que la insignia sigue diciendo "Verificado" sin serlo.
        """
        if self.status == CredentialStatus.Verificado:
            if self.verification_expires_at and self.verification_expires_at < date.today():
                return CredentialStatus.PorRevalidar
        return self.status

    @property
    def card_number_masked(self) -> str:
        """Últimos 4 caracteres de la matrícula. Es lo único que ven terceros."""
        number = self.professional_card_number or ''
        if len(number) <= 4:
            return number
        return f"••••{number[-4:]}"

    def public_summary(self) -> dict:
        """Resumen que puede ver cualquier usuario autenticado.

        Nunca incluye la matrícula completa, el motivo de rechazo ni las notas
        del verificador: son del titular y de quien verifica.
        """
        status = self.effective_status
        return {
            'user_id': self.user_id,
            'title': self.title.value if self.title else None,
            'status': status.value,
            'card_number_masked': self.card_number_masked,
            'specialization': self.specialization,
            'verified_at': self.verified_at.isoformat() if self.verified_at else None,
            'verified_by_name': self.verified_by.fullname if self.verified_by else None,
            'verification_expires_at': (
                self.verification_expires_at.isoformat() if self.verification_expires_at else None
            ),
        }

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        data = super().to_namespace_dict(include_relations, depth, fields)
        # El estado persistido puede estar vencido; el consumidor necesita el real.
        data['effective_status'] = self.effective_status.value
        data['card_number_masked'] = self.card_number_masked
        if self.verified_by:
            data['verified_by_name'] = self.verified_by.fullname
        return data

    def mark_verified(self, verifier_id: int, source: str, reference: str, notes: str | None = None):
        """Registra el cotejo contra el registro público."""
        now = datetime.now(UTC)
        self.status = CredentialStatus.Verificado
        self.verified_by_id = verifier_id
        self.verified_at = now
        self.verification_source = source
        self.verification_reference = reference
        self.verification_notes = notes
        self.verification_expires_at = date.fromordinal(
            now.date().toordinal() + VERIFICATION_VALIDITY_DAYS
        )
        self.rejection_reason = None

    def mark_rejected(self, verifier_id: int, reason: str):
        self.status = CredentialStatus.Rechazado
        self.verified_by_id = verifier_id
        self.verified_at = datetime.now(UTC)
        self.verification_expires_at = None
        self.verification_reference = None
        self.rejection_reason = reason

    def __repr__(self):
        return f'<ProfessionalCredential User={self.user_id} Status={self.status.value}>'
