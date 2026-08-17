from typing import Any

from app.models.treatment_recommendation_controls import TreatmentRecommendationControls
from app.models.treatment_recommendations import TreatmentRecommendations


class TreatmentRecommendationSerializer:
    """Presenta recomendaciones y controles para las respuestas API."""

    @staticmethod
    def serialize_recommendation(
        recommendation: TreatmentRecommendations,
        include_controls: bool = False,
        include_next_control: bool = False,
    ) -> dict[str, Any]:
        data = recommendation.to_namespace_dict()
        data["animal"] = (
            recommendation.animal.to_namespace_dict(
                fields=["id", "record", "sex", "status"]
            )
            if recommendation.animal
            else None
        )
        data["finca"] = (
            recommendation.finca.to_namespace_dict(fields=["id", "name"])
            if recommendation.finca
            else None
        )
        if include_controls:
            controls = [
                control for control in recommendation.controls if not control.is_deleted
            ]
            data["controls"] = [
                TreatmentRecommendationSerializer.serialize_control(control)
                for control in controls
            ]
            data["next_control"] = next(
                (
                    TreatmentRecommendationSerializer.serialize_control(control)
                    for control in controls
                    if not control.completed
                ),
                None,
            )
        elif include_next_control:
            next_control = next(
                (
                    control
                    for control in recommendation.controls
                    if not control.is_deleted and not control.completed
                ),
                None,
            )
            data["next_control"] = (
                TreatmentRecommendationSerializer.serialize_control(next_control)
                if next_control
                else None
            )
        return data

    @staticmethod
    def serialize_control(control: TreatmentRecommendationControls) -> dict[str, Any]:
        data = control.to_namespace_dict()
        if control.recorder:
            data["recorder"] = control.recorder.to_namespace_dict(
                fields=["id", "fullname", "role"]
            )
        return data


__all__ = ["TreatmentRecommendationSerializer"]
