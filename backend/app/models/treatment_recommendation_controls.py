from datetime import date
from typing import Any

from app import db
from app.models.base_model import BaseModel, ValidationError


class TreatmentRecommendationControls(BaseModel):
    """Control programado o realizado de una recomendación veterinaria."""

    __tablename__ = "treatment_recommendation_controls"
    __table_args__ = (
        db.UniqueConstraint(
            "treatment_recommendation_id",
            "scheduled_date",
            name="uq_recommendation_control_schedule",
        ),
        db.Index(
            "ix_recommendation_controls_schedule_status",
            "scheduled_date",
            "completed",
        ),
        db.Index("ix_recommendation_controls_treatment", "treatment_recommendation_id"),
        db.Index("ix_recommendation_controls_recorded_by", "recorded_by"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    treatment_recommendation_id = db.Column(
        db.Integer,
        db.ForeignKey("treatment_recommendations.id", ondelete="CASCADE"),
        nullable=False,
    )
    scheduled_date = db.Column(db.Date, nullable=False)
    control_date = db.Column(db.Date, nullable=True)
    observation = db.Column(db.Text, nullable=True)
    completed = db.Column(db.Boolean, nullable=False, default=False)
    recorded_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    _namespace_fields = [
        "id", "treatment_recommendation_id", "scheduled_date", "control_date",
        "observation", "completed", "recorded_by", "created_at", "updated_at",
    ]
    _namespace_relations = {
        "treatment_recommendation": {
            "fields": ["id", "title", "animal_id", "status"],
            "depth": 1,
        },
        "recorder": {"fields": ["id", "fullname", "role"], "depth": 1},
    }
    _searchable_fields = ["observation"]
    _filterable_fields = [
        "treatment_recommendation_id", "scheduled_date", "control_date", "completed", "recorded_by",
    ]
    _sortable_fields = ["id", "scheduled_date", "control_date", "created_at"]
    _required_fields = ["treatment_recommendation_id", "scheduled_date"]

    treatment_recommendation = db.relationship(
        "TreatmentRecommendations",
        back_populates="controls",
        lazy="selectin",
    )
    recorder = db.relationship("User", foreign_keys=[recorded_by], lazy="selectin")

    @classmethod
    def _validate_and_normalize(
        cls,
        data: dict[str, Any],
        is_update: bool = False,
        instance_id: int | None = None,
    ) -> dict[str, Any]:
        normalized = super()._validate_and_normalize(data, is_update, instance_id)
        if normalized.get("completed") and not normalized.get("control_date"):
            raise ValidationError(
                "Un control completado debe tener fecha de realización",
                code="validation_error",
            )
        control_date = normalized.get("control_date")
        if control_date and control_date > date.today():
            raise ValidationError(
                "La fecha del control no puede ser futura",
                code="validation_error",
            )
        return normalized

    def __repr__(self) -> str:
        return f"<TreatmentRecommendationControl {self.id}: {self.scheduled_date}>"
