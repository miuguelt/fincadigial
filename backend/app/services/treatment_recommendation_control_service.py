from typing import Any

from sqlalchemy.exc import IntegrityError

from app import db
from app.models.base_model import ValidationError
from app.models.treatment_recommendation_controls import TreatmentRecommendationControls
from app.services.treatment_recommendation_service import TreatmentRecommendationService
from app.utils.custom_exceptions import ConflictException, ResourceNotFoundException


class TreatmentRecommendationControlService:
    """Actualiza controles generados automáticamente por una recomendación."""

    @staticmethod
    def list_controls(recommendation_id: int) -> list[TreatmentRecommendationControls]:
        recommendation = TreatmentRecommendationService.get_recommendation(
            recommendation_id
        )
        return [
            control for control in recommendation.controls if not control.is_deleted
        ]

    @staticmethod
    def get_control(
        recommendation_id: int,
        control_id: int,
    ) -> TreatmentRecommendationControls:
        controls = TreatmentRecommendationControlService.list_controls(
            recommendation_id
        )
        control = next((item for item in controls if item.id == control_id), None)
        if not control:
            raise ResourceNotFoundException(
                "El control de seguimiento no fue encontrado"
            )
        return control

    @staticmethod
    def update_control(
        recommendation_id: int,
        control_id: int,
        data: dict[str, Any],
        user_id: int | None,
    ) -> TreatmentRecommendationControls:
        control = TreatmentRecommendationControlService.get_control(
            recommendation_id,
            control_id,
        )
        allowed = {"completed", "control_date", "observation"}
        payload = {key: value for key, value in data.items() if key in allowed}
        if not payload:
            raise ValidationError(
                "Indica qué información del control deseas actualizar"
            )
        if payload.get("completed") is False and "control_date" not in payload:
            payload["control_date"] = None
        if payload.get("completed"):
            payload["recorded_by"] = user_id
        try:
            control.update(commit=False, updated_by=user_id, **payload)
            db.session.commit()
            return control
        except IntegrityError as exc:
            db.session.rollback()
            raise ConflictException(
                "No se pudo actualizar el control de seguimiento"
            ) from exc
