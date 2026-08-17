"""Reglas de alertas para recomendaciones veterinarias activas."""

from datetime import date

from app.models.alerts import AlertPriority, AlertType
from app.models.treatment_recommendations import (
    TreatmentRecommendationStatus,
    TreatmentRecommendations,
)
from app.services.alert_engine import AlertEngine


def evaluate_recommendation_rules(
    animal, finca_id, trig, today: date, age_months
) -> None:
    """Dispara avisos por controles y cierres próximos o atrasados."""
    recommendations = TreatmentRecommendations.query.filter_by(
        animal_id=animal.id,
        status=TreatmentRecommendationStatus.IN_PROGRESS.value,
        is_deleted=False,
    ).all()
    control_lead_days = AlertEngine._get_param_int("recommendation_control_alert_days")
    finish_lead_days = AlertEngine._get_param_int("recommendation_finish_alert_days")
    for recommendation in recommendations:
        _evaluate_controls(recommendation, today, control_lead_days, trig)
        _evaluate_finish(recommendation, today, finish_lead_days, trig)


def _evaluate_controls(recommendation, today, lead_days, trig) -> None:
    pending = [
        control
        for control in recommendation.controls
        if not control.is_deleted and not control.completed
    ]
    if not pending:
        return
    overdue = next(
        (control for control in pending if control.scheduled_date < today), None
    )
    if overdue:
        trig(
            AlertType.HEALTH,
            f"Control atrasado de '{recommendation.title}' desde {overdue.scheduled_date:%d/%m/%Y}. Registra el seguimiento del animal.",
            AlertPriority.HIGH,
        )
        return
    next_control = min(pending, key=lambda control: control.scheduled_date)
    days_until = (next_control.scheduled_date - today).days
    if lead_days is not None and days_until <= lead_days:
        trig(
            AlertType.HEALTH,
            f"Control pendiente de '{recommendation.title}' para {next_control.scheduled_date:%d/%m/%Y}.",
            AlertPriority.MEDIUM,
        )


def _evaluate_finish(recommendation, today, lead_days, trig) -> None:
    if lead_days is None:
        return
    days_until = (recommendation.estimated_end_date - today).days
    if 0 <= days_until <= lead_days:
        trig(
            AlertType.HEALTH,
            f"La recomendación '{recommendation.title}' termina el {recommendation.estimated_end_date:%d/%m/%Y}. Decide si cierras o extiendes el manejo.",
            AlertPriority.MEDIUM,
        )
