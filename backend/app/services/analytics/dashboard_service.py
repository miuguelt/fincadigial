"""Dashboard analytics facade.

Kept as a class because the API namespace and the performance script call it
that way; the work lives in `app.services.analytics.dashboard`.
"""

from app.services.analytics.dashboard import (
    get_alerts_summary,
    get_basic_stats,
    get_complete_stats,
    get_daily_operational_agenda,
    get_profitability_insights,
    percentage_change,
    safe_round,
)


class DashboardService:
    """Cifras del tablero de la finca."""

    @staticmethod
    def _round(value, precision=0):
        return safe_round(value, precision)

    @staticmethod
    def calculate_percentage_change(current_value, previous_value, cap=999.0):
        return percentage_change(current_value, previous_value, cap)

    @staticmethod
    def get_basic_stats(finca_id=None):
        return get_basic_stats(finca_id)

    @staticmethod
    def get_alerts_summary(finca_id):
        return get_alerts_summary(finca_id)

    @staticmethod
    def get_profitability_insights(finca_id):
        return get_profitability_insights(finca_id)

    @staticmethod
    def get_daily_operational_agenda(finca_id):
        return get_daily_operational_agenda(finca_id)

    @staticmethod
    def get_complete_stats(finca_id=None):
        return get_complete_stats(finca_id)
