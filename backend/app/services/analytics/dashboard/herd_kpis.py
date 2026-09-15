"""Herd health indicators and the four-week health trend."""

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import and_, case, func

from app import db

from .basic_stats import recent_additions

# Ventana de los indicadores y de la tendencia.
KPI_WINDOW_DAYS = 30
VACCINATION_WINDOW_DAYS = 180
TREND_WEEKS = 4


@dataclass(frozen=True)
class HerdKpis:
    health_index: float | None
    vaccination_coverage: float | None
    control_compliance: float | None
    herd_growth: float | None


def herd_kpis(
    finca_id, summary, without_control: int, without_vaccination: int
) -> HerdKpis:
    """Porcentajes de salud, cobertura, cumplimiento y crecimiento del ganado.

    Sin animales vivos todo queda en cero: un 100 % calculado sobre cero
    animales se leería como "todo perfecto" cuando no hay nada que medir.
    """
    active = summary.active_animals or 0
    if active == 0:
        # Las tasas no están definidas si no hay animales sobre los cuales
        # calcularlas. Null permite que la interfaz muestre “—” en vez de
        # presentar un cero como resultado sanitario.
        return HerdKpis(None, None, None, None)

    return HerdKpis(
        health_index=round(((active - summary.sick_animals) / active) * 100, 1),
        vaccination_coverage=round(((active - without_vaccination) / active) * 100, 1),
        control_compliance=round(((active - without_control) / active) * 100, 1),
        herd_growth=round(
            (recent_additions(finca_id, KPI_WINDOW_DAYS) / active) * 100, 1
        ),
    )


def health_trend(finca_id, has_animals: bool) -> list[dict]:
    """Salud semana a semana durante el último mes, en una sola consulta."""
    from app.models.control import Control, HealthStatus

    now = datetime.now(UTC)
    weeks = [
        (
            (now - timedelta(days=(TREND_WEEKS - index) * 7)).date(),
            (now - timedelta(days=(TREND_WEEKS - 1 - index) * 7)).date(),
        )
        for index in range(TREND_WEEKS)
    ]

    expressions = []
    for start, end in weeks:
        in_week = and_(Control.checkup_date >= start, Control.checkup_date < end)
        expressions.append(func.sum(case((in_week, 1), else_=0)))
        expressions.append(
            func.sum(
                case(
                    (and_(in_week, Control.health_status == HealthStatus.Malo), 1),
                    else_=0,
                )
            )
        )

    query = db.session.query(*expressions).filter(Control.is_deleted.is_(False))
    if finca_id:
        query = query.filter(Control.finca_id == finca_id)
    counts = query.one()

    trend = []
    for index in range(TREND_WEEKS):
        total = int(counts[index * 2] or 0)
        sick = int(counts[index * 2 + 1] or 0)
        if total > 0:
            value = max(0, 100 - ((sick / total) * 100))
        else:
            # La ausencia de controles no es evidencia de salud. El cliente
            # presenta este punto como desconocido y no lo dibuja como 0/100.
            value = None
        trend.append({
            "name": f"Sem {index + 1}",
            "value": round(value, 1) if value is not None else None,
        })
    return trend
