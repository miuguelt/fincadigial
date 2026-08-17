import enum
from datetime import date
from typing import Any

from app import db
from app.models.base_model import BaseModel, ValidationError


class TreatmentRecommendationStatus(enum.Enum):
    IN_PROGRESS = "en_curso"
    COMPLETED = "completado"
    SUSPENDED = "suspendido"


class TreatmentRecommendations(BaseModel):
    """Indicaciones veterinarias sin medicamentos ni insumos asociados."""

    __tablename__ = "treatment_recommendations"
    __table_args__ = (
        db.Index(
            "ix_treatment_recommendations_animal_status",
            "animal_id",
            "status",
        ),
        db.Index(
            "ix_treatment_recommendations_finca_status",
            "finca_id",
            "status",
        ),
        db.Index(
            "ix_treatment_recommendations_end_date",
            "estimated_end_date",
        ),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    title = db.Column(db.String(160), nullable=False)
    recommendation = db.Column(db.Text, nullable=False)
    responsible = db.Column(db.String(160), nullable=True)
    start_date = db.Column(db.Date, nullable=False)
    estimated_end_date = db.Column(db.Date, nullable=False)
    duration_days = db.Column(db.Integer, nullable=False)
    control_interval_days = db.Column(db.Integer, nullable=False)
    status = db.Column(
        db.String(20),
        nullable=False,
        default=TreatmentRecommendationStatus.IN_PROGRESS.value,
    )
    final_notes = db.Column(db.Text, nullable=True)

    _namespace_fields = [
        "id",
        "animal_id",
        "finca_id",
        "title",
        "recommendation",
        "responsible",
        "start_date",
        "estimated_end_date",
        "duration_days",
        "control_interval_days",
        "status",
        "final_notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animal": {"fields": ["id", "record", "sex", "status"], "depth": 1},
        "finca": {"fields": ["id", "name"]},
        "controls": {
            "fields": [
                "id",
                "scheduled_date",
                "control_date",
                "observation",
                "completed",
                "recorded_by",
            ],
            "depth": 1,
        },
    }
    _searchable_fields = ["title", "recommendation", "responsible", "final_notes"]
    _filterable_fields = [
        "animal_id",
        "finca_id",
        "status",
        "start_date",
        "estimated_end_date",
    ]
    _sortable_fields = [
        "id",
        "start_date",
        "estimated_end_date",
        "status",
        "created_at",
    ]
    _required_fields = [
        "animal_id",
        "title",
        "recommendation",
        "start_date",
        "estimated_end_date",
        "duration_days",
        "control_interval_days",
    ]

    # backref (not back_populates): Animals does not declare the reverse side,
    # and this matches how every other model in the package links to it.
    animal = db.relationship(
        "Animals",
        backref="treatment_recommendations",
        lazy="selectin",
    )
    finca = db.relationship(
        "Finca", backref="treatment_recommendations", lazy="selectin"
    )
    controls = db.relationship(
        "TreatmentRecommendationControls",
        back_populates="treatment_recommendation",
        lazy="selectin",
        order_by="TreatmentRecommendationControls.scheduled_date",
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
        errors: list[str] = []
        status = normalized.get("status")
        status_value = status.value if isinstance(status, enum.Enum) else status
        if status_value is not None:
            valid_statuses = {item.value for item in TreatmentRecommendationStatus}
            if status_value not in valid_statuses:
                errors.append("El estado debe ser en_curso, completado o suspendido")
            else:
                normalized["status"] = status_value

        start_date = normalized.get("start_date")
        end_date = normalized.get("estimated_end_date")
        if start_date and end_date and end_date < start_date:
            errors.append(
                "La fecha estimada de finalización no puede ser anterior al inicio"
            )
        if (
            normalized.get("duration_days") is not None
            and normalized["duration_days"] <= 0
        ):
            errors.append("La duración debe ser mayor que cero")
        if (
            normalized.get("control_interval_days") is not None
            and normalized["control_interval_days"] <= 0
        ):
            errors.append("El intervalo de control debe ser mayor que cero")
        if errors:
            raise ValidationError(
                "; ".join(errors), code="validation_error", errors=errors
            )
        return normalized

    def __repr__(self) -> str:
        return f"<TreatmentRecommendation {self.id}: {self.title[:40]}>"
