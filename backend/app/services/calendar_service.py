"""
Servicio de Calendario Global de la Finca (fachada).

Consolida en una sola fuente todos los eventos relevantes para el campesino:
- Eventos reproductivos y partos estimados
- Tratamientos y fechas de fin de retiro (leche/carne apta)
- Vacunaciones aplicadas y próximas dosis programadas
- Controles veterinarios (pesajes)
- Tareas operativas con fecha de vencimiento
- Alertas críticas del motor de alertas

Flujo: route (calendar_ns) -> CalendarService -> calendar_event_sources -> DB
"""

import logging
from datetime import date

from app.services import calendar_event_sources as sources

logger = logging.getLogger(__name__)

# Re-export para compatibilidad con consumidores existentes
EVENT_COLORS = sources.EVENT_COLORS


class CalendarService:
    """Consultas de solo lectura para el calendario global."""

    @staticmethod
    def get_global_events(start_date: date, end_date: date) -> list[dict]:
        """Todos los eventos del sistema entre start_date y end_date."""
        events: list[dict] = []
        events += sources.reproduction_events(start_date, end_date)
        events += sources.treatment_events(start_date, end_date)
        events += sources.vaccination_events(start_date, end_date)
        events += sources.control_events(start_date, end_date)
        events += sources.task_events(start_date, end_date)
        events += sources.alert_events(start_date, end_date)
        return events
