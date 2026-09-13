import enum as _enum
from datetime import date, timedelta
from app import db
from app.models.base_model import BaseModel
from app.models.animals import Sex
from sqlalchemy import Index


def _get_gestation_days() -> int:
    from app.models.system_content import SystemContent

    entry = SystemContent.get_by_key("param.reproduction.gestation_days")
    return int(float(entry.content)) if (entry and entry.content) else 283


class EventType(_enum.Enum):
    Celo = "Celo"
    Inseminacion = "Inseminacion"
    Diagnostico = "Diagnostico"
    Parto = "Parto"
    #: Fin de la lactancia, 60 días antes del parto esperado. Cierra el ciclo
    #: con fecha real en vez de dejarlo vencer por antigüedad.
    Secado = "Secado"


class InseminationTechnique(_enum.Enum):
    Natural = "Natural"
    Artificial = "Artificial"
    Transferencia_Embrionaria = "Transferencia_Embrionaria"


class DiagnosisResult(_enum.Enum):
    Positivo = "Positivo"
    Negativo = "Negativo"
    Pendiente = "Pendiente"


class ReproductiveEvent(BaseModel):
    __tablename__ = "reproductive_events"
    __table_args__ = (
        Index("ix_repr_events_animal_id", "animal_id"),
        Index("ix_repr_events_event_date", "event_date"),
        Index("ix_repr_events_event_type", "event_type"),
        Index("ix_repr_events_finca_id", "finca_id"),
        Index("ix_repr_events_linked", "linked_event_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    control_id = db.Column(db.Integer, db.ForeignKey("control.id"), nullable=True)
    event_type = db.Column(db.Enum(EventType), nullable=False)
    event_date = db.Column(db.Date, nullable=False)

    # Evento que dio origen a este (Parto ← Diagnóstico ← Inseminación): arma
    # el hilo del ciclo reproductivo para poder recorrerlo desde el historial.
    linked_event_id = db.Column(
        db.Integer,
        db.ForeignKey("reproductive_events.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Inseminación
    sire_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)
    technique = db.Column(db.Enum(InseminationTechnique), nullable=True)

    # Diagnóstico de preñez
    diagnosis_result = db.Column(db.Enum(DiagnosisResult), nullable=True)
    expected_birth_date = db.Column(db.Date, nullable=True)

    # Parto
    alive_count = db.Column(db.Integer, nullable=True)
    dead_count = db.Column(db.Integer, nullable=True)
    complications = db.Column(db.Boolean, nullable=True, default=False)

    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    notes = db.Column(db.String(500), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    animal = db.relationship("Animals", foreign_keys=[animal_id], lazy="selectin")
    control = db.relationship("Control", foreign_keys=[control_id], lazy="selectin")
    sire = db.relationship("Animals", foreign_keys=[sire_id], lazy="selectin")
    actor = db.relationship("User", foreign_keys=[actor_id], lazy="selectin")
    linked_event = db.relationship(
        "ReproductiveEvent",
        remote_side=[id],
        foreign_keys=[linked_event_id],
        lazy="selectin",
    )
    offspring = db.relationship(
        "Offspring",
        back_populates="birth_event",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )

    _namespace_fields = [
        "id",
        "animal_id",
        "control_id",
        "event_type",
        "event_date",
        "linked_event_id",
        "sire_id",
        "technique",
        "diagnosis_result",
        "expected_birth_date",
        "alive_count",
        "dead_count",
        "complications",
        "actor_id",
        "notes",
        "finca_id",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animal": {"fields": ["id", "record", "sex"]},
        "control": {"fields": ["id", "health_status"]},
        "sire": {"fields": ["id", "record"]},
        "actor": {"fields": ["id", "fullname"]},
        "linked_event": {"fields": ["id", "event_type", "event_date"]},
    }
    _searchable_fields = ["notes"]
    _filterable_fields = [
        "animal_id",
        "control_id",
        "event_type",
        "event_date",
        "diagnosis_result",
        "sire_id",
        "finca_id",
    ]
    _sortable_fields = ["id", "event_date", "event_type", "created_at"]
    _required_fields = ["animal_id", "event_type", "event_date"]
    _unique_fields = []
    _enum_fields = {
        "event_type": EventType,
        "technique": InseminationTechnique,
        "diagnosis_result": DiagnosisResult,
    }

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        data = super().to_namespace_dict(
            include_relations=include_relations, depth=depth, fields=fields
        )
        data["days_to_birth"] = self.days_to_birth
        data["is_overdue"] = self.is_overdue
        return data

    @classmethod
    def create(cls, commit=True, **kwargs):
        """Crea el evento reproductivo y lo espeja en la bitácora unificada."""
        instance = super().create(commit=False, **kwargs)
        instance._mirror_to_health_history()
        if commit:
            db.session.commit()
            db.session.refresh(instance)
        return instance

    def update(self, commit=True, **kwargs):
        """Actualiza el evento y su espejo en la bitácora."""
        result = super().update(commit=False, **kwargs)
        self._mirror_to_health_history()
        if commit:
            db.session.commit()
            db.session.refresh(self)
        return result

    def delete(self, commit=True, hard_delete=False):
        """Retira el espejo de la bitácora."""
        self._remove_health_history_mirror()
        return super().delete(commit=commit, hard_delete=hard_delete)

    def restore(self, commit=True):
        """Recrea el espejo de la bitácora."""
        result = super().restore(commit=commit)
        self._mirror_to_health_history()
        if commit:
            db.session.commit()
        return result

    def _mirror_to_health_history(self):
        """Espeja el evento reproductivo en la bitácora unificada del animal."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import upsert_event

        event_type = self.event_type.value if self.event_type else "Evento"
        detail = event_type
        if self.diagnosis_result:
            detail = f"{detail} — {self.diagnosis_result.value}"
        if self.expected_birth_date:
            detail = f"{detail} — Parto probable: {self.expected_birth_date}"
        if self.notes:
            detail = f"{detail} | {self.notes}"

        upsert_event(
            event_type=HealthEventType.Reproduction,
            reference_kind="reproductive_event",
            reference_id=self.id,
            animal_id=self.animal_id,
            finca_id=self.finca_id,
            event_date=self.event_date,
            description=detail,
            performed_by=self.actor_id,
        )

    def _remove_health_history_mirror(self):
        """Retira el espejo de la bitácora."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import drop_event

        drop_event(HealthEventType.Reproduction, "reproductive_event", self.id)

    #: Eventos que pueden anunciar un parto: el servicio y el diagnóstico que
    #: lo confirma, al que el módulo le hereda la fecha probable.
    _BIRTH_FORECAST_TYPES = (EventType.Inseminacion, EventType.Diagnostico)

    @property
    def days_to_birth(self):
        if self.expected_birth_date and self.event_type in self._BIRTH_FORECAST_TYPES:
            return (self.expected_birth_date - date.today()).days
        return None

    @property
    def is_overdue(self):
        d = self.days_to_birth
        return d is not None and d < 0

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        from datetime import date as _date

        d = dict(data or {})

        # Date normalization is now handled by BaseModel (0.2 in its _validate_and_normalize)
        # We must call it EARLY if we want to use the date objects in our custom logic below
        # Or we can just rely on the fact that super()._validate_and_normalize will be called at the end.
        # But we need date objects for timedelta addition.

        # Let's ensure dates are normalized for our logic
        if "event_date" in d and isinstance(d["event_date"], str):
            try:
                d["event_date"] = _date.fromisoformat(d["event_date"])
            except (ValueError, TypeError):
                pass

        # Auto-compute expected_birth_date for inseminations
        if d.get("event_type") in ("Inseminacion", EventType.Inseminacion):
            if "expected_birth_date" not in d or not d["expected_birth_date"]:
                if d.get("event_date"):
                    ev_date = d["event_date"]
                    if isinstance(ev_date, _date):
                        gestation = _get_gestation_days()
                        d["expected_birth_date"] = (
                            ev_date + timedelta(days=gestation) if gestation else None
                        )

        return super()._validate_and_normalize(d, is_update, instance_id)


class Offspring(BaseModel):
    __tablename__ = "offspring"
    __table_args__ = (
        Index("ix_offspring_birth_event_id", "birth_event_id"),
        Index("ix_offspring_finca_id", "finca_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    birth_event_id = db.Column(
        db.Integer, db.ForeignKey("reproductive_events.id"), nullable=False
    )
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)
    sex = db.Column(db.Enum(Sex), nullable=True)
    alive = db.Column(db.Boolean, nullable=False, default=True)
    birth_weight = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.String(255), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    birth_event = db.relationship(
        "ReproductiveEvent", back_populates="offspring", lazy="selectin"
    )
    animal = db.relationship("Animals", foreign_keys=[animal_id], lazy="selectin")

    _namespace_fields = [
        "id",
        "birth_event_id",
        "animal_id",
        "sex",
        "alive",
        "birth_weight",
        "notes",
        "finca_id",
        "created_at",
    ]
    _namespace_relations = {
        "animal": {"fields": ["id", "record"]},
    }
    _filterable_fields = ["birth_event_id", "alive", "animal_id", "finca_id"]
    _sortable_fields = ["id", "created_at"]
    _required_fields = ["birth_event_id"]
    _unique_fields = []
    _enum_fields = {"sex": Sex}
