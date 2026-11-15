"""Clinical analytics facade.

Kept as a class because the API namespace calls it that way; the work lives in
`app.services.analytics.medical`, one module per question the screens ask.
"""

from datetime import date

from app.services.analytics.medical import (
    check_animal_ica,
    get_animal_medical_history,
    get_upcoming_events,
    herd_ica_compliance,
)


class MedicalAnalyticsService:
    """Historial clínico, cumplimiento ICA y eventos próximos."""

    @staticmethod
    def get_animal_medical_history(animal_id, limit=50, start_date=None, end_date=None):
        return get_animal_medical_history(animal_id, limit, start_date, end_date)

    @staticmethod
    def _check_ica_compliance(
        animal_id: int, today: date | None = None, finca_id: int | None = None
    ) -> dict:
        return check_animal_ica(animal_id, today=today, finca_id=finca_id)

    @staticmethod
    def get_herd_ica_compliance(finca_id: int, today: date | None = None) -> dict:
        return herd_ica_compliance(finca_id, today=today)

    @staticmethod
    def get_upcoming_events(days_ahead: int = 30) -> dict:
        return get_upcoming_events(days_ahead)
