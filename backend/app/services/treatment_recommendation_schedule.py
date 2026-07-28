from datetime import date, timedelta
from typing import Any

from app import db
from app.models.base_model import ValidationError
from app.models.treatment_recommendation_controls import TreatmentRecommendationControls
from app.models.treatment_recommendations import TreatmentRecommendations


class TreatmentRecommendationSchedule:
    """Normaliza fechas y mantiene los controles programados."""

    @classmethod
    def prepare_payload(
        cls,
        data: dict[str, Any],
        finca_id: int,
        current: TreatmentRecommendations | None = None,
    ) -> dict[str, Any]:
        payload = dict(data)
        start = cls.parse_date(
            payload.get("start_date", getattr(current, "start_date", None)),
            "start_date",
        )
        end_raw = payload.get("estimated_end_date", getattr(current, "estimated_end_date", None))
        duration_raw = payload.get("duration_days", getattr(current, "duration_days", None))
        end = cls.parse_date(end_raw, "estimated_end_date") if end_raw else None
        try:
            duration = int(duration_raw) if duration_raw is not None else None
        except (TypeError, ValueError) as exc:
            raise ValidationError("La duración debe ser un número entero") from exc
        if end is None and duration is not None:
            end = start + timedelta(days=duration - 1)
        if duration is None and end is not None:
            duration = (end - start).days + 1
        if end is None or duration is None:
            raise ValidationError("Indica la duración o la fecha estimada de finalización")
        if duration != (end - start).days + 1:
            raise ValidationError("La duración debe coincidir con las fechas indicadas")
        interval_raw = payload.get(
            "control_interval_days",
            getattr(current, "control_interval_days", None),
        )
        try:
            interval = int(interval_raw) if interval_raw is not None else None
        except (TypeError, ValueError) as exc:
            raise ValidationError("El intervalo de control debe ser un número entero") from exc
        if interval is None:
            raise ValidationError("El intervalo de control es obligatorio")
        payload.update(
            finca_id=finca_id,
            start_date=start,
            estimated_end_date=end,
            duration_days=duration,
            control_interval_days=interval,
            status=payload.get("status", getattr(current, "status", "en_curso")),
        )
        return payload

    @staticmethod
    def parse_date(value: Any, field: str) -> date:
        if isinstance(value, date):
            return value
        if isinstance(value, str):
            try:
                return date.fromisoformat(value)
            except ValueError as exc:
                raise ValidationError(f"{field} debe tener formato YYYY-MM-DD") from exc
        raise ValidationError(f"El campo {field} es obligatorio")

    @staticmethod
    def scheduled_dates(recommendation: TreatmentRecommendations) -> list[date]:
        current = recommendation.start_date + timedelta(days=recommendation.control_interval_days)
        dates: list[date] = []
        while current <= recommendation.estimated_end_date:
            dates.append(current)
            current += timedelta(days=recommendation.control_interval_days)
        if not dates or dates[-1] != recommendation.estimated_end_date:
            dates.append(recommendation.estimated_end_date)
        return dates

    @classmethod
    def sync_placeholders(cls, recommendation: TreatmentRecommendations) -> None:
        expected_dates = set(cls.scheduled_dates(recommendation))
        all_controls = TreatmentRecommendationControls.query.filter_by(
            treatment_recommendation_id=recommendation.id,
        ).all()
        active_controls = [control for control in all_controls if not control.is_deleted]
        controls_by_date = {control.scheduled_date: control for control in all_controls}
        for control in active_controls:
            if not control.completed and control.scheduled_date not in expected_dates:
                control.delete(commit=False)
        for scheduled_date in sorted(expected_dates):
            existing = controls_by_date.get(scheduled_date)
            if existing:
                if existing.is_deleted and not existing.completed:
                    existing.restore(commit=False)
                continue
            TreatmentRecommendationControls.create(
                commit=False,
                treatment_recommendation_id=recommendation.id,
                scheduled_date=scheduled_date,
            )


__all__ = ["TreatmentRecommendationSchedule"]
