"""Dashboard analytics: headline figures, KPIs, agenda and full payload."""

from .basic_stats import get_alerts_summary, get_basic_stats, get_profitability_insights
from .complete_stats import get_complete_stats
from .daily_agenda import get_daily_operational_agenda
from .numbers import percentage_change, safe_round, to_stat

__all__ = [
    "get_alerts_summary",
    "get_basic_stats",
    "get_complete_stats",
    "get_daily_operational_agenda",
    "get_profitability_insights",
    "percentage_change",
    "safe_round",
    "to_stat",
]
