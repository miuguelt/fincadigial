from app import db
import enum
from typing import Any

from app.models.base_model import BaseModel, ValidationError


class CarePlanType(enum.Enum):
    """Tipos de plan de manejo transversal por animal."""

    Sanitario = "Sanitario"
    Reproductivo = "Reproductivo"
    Nutricional = "Nutricional"
    Manejo = "Manejo General"
    Preventivo = "Preventivo"


class CarePlanStatus(enum.Enum):
    """Estados de un plan de manejo por animal."""

    Borrador = "Borrador"
    Activo = "Activo"
    Completado = "Completado"
    Cancelado = "Cancelado"


class AnimalCarePlan(BaseModel):
    """Plan de manejo transversal por animal.

    Es el pegamento que unifica los seguimientos parciales (recomendación
    veterinaria, ciclos reproductivos, calendario sanitario) en un plan con
    etapas programadas: cada etapa puede a su vez vincular el acto sanitario
    que la materializa (control, vacunación, tratamiento).
    """

    __tablename__ = "animal_care_plans"
    __table_args__ = (
        db.Index("ix_care_plans_finca_status", "finca_id", "status"),
        db.Index("ix_care_plans_animal_id", "animal_id"),
        db.Index("ix_care_plans_dates", "start_date", "end_date"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    plan_type = db.Column(db.Enum(CarePlanType), nullable=False)
    status = db.Column(db.Enum(CarePlanStatus), nullable=False, default=CarePlanStatus.Borrador)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    notes = db.Column(db.Text, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    _namespace_fields = [
        "id",
        "animal_id",
        "finca_id",
        "plan_type",
        "status",
        "name",
        "description",
        "start_date",
        "end_date",
        "notes",
        "created_by",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animal": {"fields": ["id", "record", "sex", "status"], "depth": 1},
        "creator": {"fields": ["id", "fullname", "role"], "depth": 1},
        "stages": {
            "fields": [
                "id",
                "stage_order",
                "stage_name",
                "start_date",
                "due_date",
                "completed",
                "completed_at",
                "observation",
                "fulfilled_kind",
                "fulfilled_ref_id",
            ],
            "depth": 1,
        },
    }
    _searchable_fields = ["name", "description", "notes"]
    _filterable_fields = [
        "animal_id",
        "finca_id",
        "plan_type",
        "status",
        "start_date",
        "end_date",
        "created_by",
    ]
    _sortable_fields = [
        "id",
        "name",
        "start_date",
        "end_date",
        "status",
        "created_at",
    ]
    _required_fields = ["animal_id", "finca_id", "plan_type", "name", "start_date", "end_date"]
    _enum_fields = {"plan_type": CarePlanType, "status": CarePlanStatus}

    animal = db.relationship(
        "Animals", foreign_keys=[animal_id], lazy="selectin"
    )
    creator = db.relationship(
        "User", foreign_keys=[created_by], lazy="selectin"
    )
    stages = db.relationship(
        "AnimalCarePlanStage",
        back_populates="plan",
        lazy="dynamic",
        order_by="AnimalCarePlanStage.stage_order",
        cascade="all, delete-orphan",
    )

    @classmethod
    def _validate_and_normalize(
        cls,
        data: dict[str, Any],
        is_update: bool = False,
        instance_id: int | None = None,
    ) -> dict[str, Any]:
        normalized = super()._validate_and_normalize(data, is_update, instance_id)
        start = normalized.get("start_date")
        end = normalized.get("end_date")
        if start and end and end < start:
            raise ValidationError(
                "La fecha de finalización no puede ser anterior al inicio",
                code="validation_error",
            )
        return normalized

    def __repr__(self) -> str:
        return f"<AnimalCarePlan {self.id}: {self.name} ({self.plan_type.value if self.plan_type else 'N/A'})>"


class AnimalCarePlanStage(BaseModel):
    """Etapa de un plan de manejo por animal.

    Cada etapa es un hito programado con su propia fecha y estado. Sigue el
    mismo patrón que los controles de una recomendación veterinaria: al
    completarse puede vincular el acto registrado que la materializa.
    """

    __tablename__ = "animal_care_plan_stages"
    __table_args__ = (
        db.UniqueConstraint(
            "plan_id", "stage_order", name="uq_care_plan_stage_order"
        ),
        db.Index("ix_care_plan_stages_plan_id", "plan_id"),
        db.Index("ix_care_plan_stages_finca_id", "finca_id"),
        db.Index("ix_care_plan_stages_due_date", "due_date"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    plan_id = db.Column(
        db.Integer,
        db.ForeignKey("animal_care_plans.id", ondelete="CASCADE"),
        nullable=False,
    )
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    stage_order = db.Column(db.Integer, nullable=False, default=0)
    stage_name = db.Column(db.String(200), nullable=False)
    start_date = db.Column(db.Date, nullable=True)
    due_date = db.Column(db.Date, nullable=True)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    completed_at = db.Column(db.Date, nullable=True)
    observation = db.Column(db.Text, nullable=True)
    fulfilled_kind = db.Column(db.String(40), nullable=True)
    fulfilled_ref_id = db.Column(db.Integer, nullable=True)
    created_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    _namespace_fields = [
        "id",
        "plan_id",
        "finca_id",
        "stage_order",
        "stage_name",
        "start_date",
        "due_date",
        "completed",
        "completed_at",
        "observation",
        "fulfilled_kind",
        "fulfilled_ref_id",
        "created_by",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "plan": {
            "fields": ["id", "name", "plan_type", "status", "animal_id"],
            "depth": 1,
        },
        "creator": {"fields": ["id", "fullname", "role"], "depth": 1},
    }
    _searchable_fields = ["stage_name", "observation"]
    _filterable_fields = [
        "plan_id",
        "finca_id",
        "stage_order",
        "completed",
        "due_date",
        "fulfilled_kind",
    ]
    _sortable_fields = ["id", "stage_order", "due_date", "completed_at", "created_at"]
    _required_fields = ["plan_id", "finca_id", "stage_name"]

    FULFILLMENT_KINDS = ("control", "vaccination", "treatment", "observation")

    plan = db.relationship(
        "AnimalCarePlan", back_populates="stages", lazy="selectin"
    )
    creator = db.relationship(
        "User", foreign_keys=[created_by], lazy="selectin"
    )

    @classmethod
    def _validate_and_normalize(
        cls,
        data: dict[str, Any],
        is_update: bool = False,
        instance_id: int | None = None,
    ) -> dict[str, Any]:
        normalized = super()._validate_and_normalize(data, is_update, instance_id)
        kind = normalized.get("fulfilled_kind")
        if kind and kind not in cls.FULFILLMENT_KINDS:
            raise ValidationError(
                "El tipo de acto debe ser control, vaccination, treatment u observation",
                code="validation_error",
            )
        if kind and kind != "observation":
            if not normalized.get("fulfilled_ref_id"):
                raise ValidationError(
                    "Un acto vinculado requiere su identificador de registro",
                    code="validation_error",
                )
        completed = normalized.get("completed")
        if completed and not normalized.get("completed_at"):
            raise ValidationError(
                "Una etapa completada requiere fecha de realización",
                code="validation_error",
            )
        return normalized

    def __repr__(self) -> str:
        return f"<AnimalCarePlanStage {self.id}: {self.stage_name} (plan {self.plan_id})>"
