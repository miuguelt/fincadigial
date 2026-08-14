from app import db
import enum
import hashlib
import re
from datetime import datetime, UTC
from app.models.base_model import BaseModel

class AlertType(enum.Enum):
    REPRODUCTION = 'Reproducción'
    HEALTH = 'Salud'
    GROWTH = 'Crecimiento'
    STATUS = 'Estado'
    PRODUCTION = 'Producción'
    CUSTOM = 'Personalizada'
    PREDICTIVE = 'Predictiva'

    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]

class AlertPriority(enum.Enum):
    LOW = 'Baja'
    MEDIUM = 'Media'
    HIGH = 'Alta'
    CRITICAL = 'Crítica'

    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]


def _enum_values(enum_cls):
    """Persist enum values because existing alert rows store Spanish labels."""
    return [choice.value for choice in enum_cls]


_DYNAMIC_ALERT_VALUE = re.compile(
    r"(?<![a-záéíóúñ])[-+]?\d+(?:[.,]\d+)*(?:\s*[%°])?",
    flags=re.IGNORECASE,
)
_ALERT_WHITESPACE = re.compile(r"\s+")


def normalize_alert_condition(message: str) -> str:
    """Return a stable condition signature without changing the user message.

    Measurements, dates and day counters naturally change on every evaluation.
    Treating the complete message as an identity therefore created a new unread
    row on every run.  The normalized text keeps the semantic rule and replaces
    only its dynamic numeric values.
    """
    normalized = (message or "").strip().casefold()
    normalized = _DYNAMIC_ALERT_VALUE.sub("#", normalized)
    return _ALERT_WHITESPACE.sub(" ", normalized)


def build_alert_dedupe_key(
    *,
    finca_id: int | None,
    animal_id: int | None,
    alert_type: AlertType | str,
    message: str,
    config_id: int | None = None,
    category: str | None = None,
) -> str:
    """Build the tenant-safe identity for one currently actionable condition."""
    type_value = alert_type.value if hasattr(alert_type, "value") else str(alert_type)
    condition = category.strip().casefold() if category else normalize_alert_condition(message)
    source = "|".join(
        (
            str(finca_id or 0),
            str(animal_id or 0),
            str(config_id or 0),
            type_value.casefold(),
            condition,
        )
    )
    return hashlib.sha256(source.encode("utf-8")).hexdigest()

class AnimalAlertConfig(BaseModel):
    """Configuración de alertas para animales.
    Si animal_id es None y finca_id está presente → config global de finca (aplica a todos los animales).
    """
    __tablename__ = 'animal_alert_configs'

    __table_args__ = (
        db.Index('ix_animal_alert_configs_finca_id', 'finca_id'),
    )

    id              = db.Column(db.Integer, primary_key=True)
    animal_id       = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=True)  # None = global de finca
    alert_type      = db.Column(db.Enum(AlertType, values_callable=_enum_values), nullable=False)
    dimension       = db.Column(db.String(50), nullable=False)
    condition_value = db.Column(db.String(255), nullable=False)
    message         = db.Column(db.Text, nullable=False)
    priority        = db.Column(db.Enum(AlertPriority, values_callable=_enum_values), default=AlertPriority.HIGH)
    is_active       = db.Column(db.Boolean, default=True)
    is_default      = db.Column(db.Boolean, default=False)  # True = plantilla del sistema
    finca_id        = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=True)

    # Relación con el animal (opcional)
    animal = db.relationship('Animals', back_populates='alert_configs')

    # Configuración para namespaces
    _namespace_fields  = ['id', 'animal_id', 'alert_type', 'dimension', 'condition_value', 'message', 'priority', 'is_active', 'is_default', 'finca_id', 'created_at', 'updated_at']
    _filterable_fields = ['animal_id', 'alert_type', 'is_active', 'is_default', 'finca_id']
    _enum_fields = {'alert_type': AlertType, 'priority': AlertPriority}

class AnimalAlert(BaseModel):
    """Alertas disparadas para animales."""
    __tablename__ = 'animal_alerts'
    __table_args__ = (
        db.Index('ix_animal_alerts_animal_read', 'animal_id', 'is_read'),
        db.Index('ix_animal_alerts_finca_id', 'finca_id'),
        db.Index(
            'ix_animal_alerts_finca_unread_triggered',
            'finca_id',
            'triggered_at',
            postgresql_where=db.text('is_read = false'),
        ),
        db.Index(
            'ix_animal_alerts_finca_priority_unread_triggered',
            'finca_id',
            'priority',
            'triggered_at',
            postgresql_where=db.text('is_read = false'),
        ),
        db.Index(
            'uq_animal_alerts_unread_dedupe_key',
            'dedupe_key',
            unique=True,
            postgresql_where=db.text(
                'is_read = false AND dedupe_key IS NOT NULL AND superseded_by_id IS NULL'
            ),
            sqlite_where=db.text(
                'is_read = 0 AND dedupe_key IS NOT NULL AND superseded_by_id IS NULL'
            ),
        ),
    )

    id           = db.Column(db.Integer, primary_key=True)
    animal_id    = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=True) # Opcional
    field_id     = db.Column(db.Integer, db.ForeignKey('fields.id'), nullable=True)   # Nuevo: Vínculo con potrero
    config_id    = db.Column(db.Integer, db.ForeignKey('animal_alert_configs.id'), nullable=True)
    alert_type   = db.Column(db.Enum(AlertType, values_callable=_enum_values), nullable=False)
    message      = db.Column(db.Text, nullable=False)
    recommendation = db.Column(db.Text, nullable=True)  # Campo para sugerencias de IA (offline base)
    priority     = db.Column(db.Enum(AlertPriority, values_callable=_enum_values), default=AlertPriority.MEDIUM)
    is_read      = db.Column(db.Boolean, default=False)
    triggered_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC))
    finca_id     = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=True)
    dedupe_key   = db.Column(db.String(64), nullable=True)
    superseded_by_id = db.Column(db.Integer, nullable=True)

    # Relaciones
    animal = db.relationship('Animals', back_populates='alerts')
    field  = db.relationship('Fields', backref=db.backref('alerts', lazy='dynamic'))
    config = db.relationship('AnimalAlertConfig', backref=db.backref('triggered_alerts', lazy='dynamic'))

    # Configuración para namespaces
    _namespace_fields  = ['id', 'animal_id', 'field_id', 'config_id', 'alert_type', 'message', 'recommendation', 'priority', 'is_read', 'triggered_at', 'finca_id', 'created_at']
    _filterable_fields = ['animal_id', 'alert_type', 'priority', 'is_read', 'finca_id']
    _enum_fields = {'alert_type': AlertType, 'priority': AlertPriority}
