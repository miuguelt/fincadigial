from typing import Any

from sqlalchemy import desc, or_
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.animals import Animals
from app.models.treatment_recommendations import TreatmentRecommendations
from app.utils.custom_exceptions import ConflictException, ResourceNotFoundException
from app.utils.tenant_context import apply_tenant_filter
from app.services.treatment_recommendation_schedule import (
    TreatmentRecommendationSchedule,
)


class TreatmentRecommendationService:
    """Casos de uso para recomendaciones veterinarias y sus placeholders."""

    @staticmethod
    def list_recommendations(
        page: int,
        limit: int,
        animal_id: int | None = None,
        status: str | None = None,
        search: str | None = None,
    ):
        query = apply_tenant_filter(
            TreatmentRecommendations.query.filter_by(is_deleted=False),
            TreatmentRecommendations,
        )
        if animal_id:
            query = query.filter_by(animal_id=animal_id)
        if status:
            query = query.filter_by(status=status)
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(
                    TreatmentRecommendations.title.ilike(term),
                    TreatmentRecommendations.recommendation.ilike(term),
                    TreatmentRecommendations.responsible.ilike(term),
                )
            )
        return query.order_by(
            desc(TreatmentRecommendations.start_date),
            desc(TreatmentRecommendations.id),
        ).paginate(page=page, per_page=limit, error_out=False)

    @staticmethod
    def get_recommendation(recommendation_id: int) -> TreatmentRecommendations:
        query = apply_tenant_filter(
            TreatmentRecommendations.query.filter_by(
                id=recommendation_id,
                is_deleted=False,
            ),
            TreatmentRecommendations,
        )
        recommendation = query.first()
        if not recommendation:
            raise ResourceNotFoundException(
                "La recomendación veterinaria no fue encontrada",
                resource_name="TreatmentRecommendation",
                resource_id=recommendation_id,
            )
        return recommendation

    @classmethod
    def create_recommendation(
        cls,
        data: dict[str, Any],
        finca_id: int,
        user_id: int | None,
    ) -> TreatmentRecommendations:
        payload = TreatmentRecommendationSchedule.prepare_payload(data, finca_id)
        cls._assert_animal(payload["animal_id"], finca_id)
        try:
            recommendation = TreatmentRecommendations.create(
                commit=False,
                created_by=user_id,
                **payload,
            )
            TreatmentRecommendationSchedule.sync_placeholders(recommendation)
            db.session.commit()
            return recommendation
        except IntegrityError as exc:
            db.session.rollback()
            raise ConflictException(
                "No se pudo guardar la recomendación veterinaria"
            ) from exc

    @classmethod
    def update_recommendation(
        cls,
        recommendation_id: int,
        data: dict[str, Any],
        finca_id: int | None,
        user_id: int | None,
    ) -> TreatmentRecommendations:
        recommendation = cls.get_recommendation(recommendation_id)
        if finca_id and recommendation.finca_id != finca_id:
            raise ResourceNotFoundException(
                "La recomendación veterinaria no fue encontrada"
            )
        payload = TreatmentRecommendationSchedule.prepare_payload(
            data,
            recommendation.finca_id,
            recommendation,
        )
        cls._assert_animal(
            payload.get("animal_id", recommendation.animal_id),
            recommendation.finca_id,
        )
        try:
            recommendation.update(commit=False, updated_by=user_id, **payload)
            TreatmentRecommendationSchedule.sync_placeholders(recommendation)
            db.session.commit()
            return recommendation
        except IntegrityError as exc:
            db.session.rollback()
            raise ConflictException(
                "No se pudo actualizar la recomendación veterinaria"
            ) from exc

    @classmethod
    def delete_recommendation(cls, recommendation_id: int) -> None:
        recommendation = cls.get_recommendation(recommendation_id)
        for control in recommendation.controls:
            if not control.is_deleted:
                control.delete(commit=False)
        recommendation.delete(commit=False)
        db.session.commit()

    @staticmethod
    def _assert_animal(animal_id: int, finca_id: int) -> None:
        animal = Animals.query.filter_by(
            id=animal_id,
            finca_id=finca_id,
            is_deleted=False,
        ).first()
        if not animal:
            raise ResourceNotFoundException("El animal no pertenece a la finca activa")
