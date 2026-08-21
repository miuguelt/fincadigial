"""Relación entre condición corporal y concepción.

La condición corporal al momento del servicio es el factor de manejo que más
mueve la tasa de concepción, y la finca ya la registra en `body_condition_scores`
sin que nadie la cruzara con reproducción. Este módulo empareja cada servicio
con la medición vigente más cercana y agrupa el resultado por banda de BCS.
"""

from datetime import date, timedelta

from app.models.body_condition_scores import BodyConditionScore

from .pregnancy_resolver import PENDING, ServiceUnit

#: Antigüedad máxima de una medición para explicar un servicio.
BCS_LOOKBACK_DAYS = 45


def conception_by_body_condition(
    units: dict[int, list[ServiceUnit]],
    finca_id: int,
    period_start: date,
) -> dict:
    """Tasa de concepción por banda de condición corporal.

    Solo entran los servicios ya resueltos que tienen una medición de condición
    corporal en los ``BCS_LOOKBACK_DAYS`` previos: una medición más vieja
    describe otro momento del animal y contaminaría la lectura.
    """
    resolved = [
        unit
        for animal_units in units.values()
        for unit in animal_units
        if unit.outcome != PENDING and unit.service_date >= period_start
    ]
    if not resolved:
        return {"bands": {}, "coverage_pct": 0.0, "matched_services": 0}

    scores = _scores_by_animal(finca_id, period_start)
    bands: dict[str, dict[str, int]] = {}
    matched = 0
    for unit in resolved:
        score = _score_for(scores.get(unit.animal_id, []), unit.service_date)
        if score is None:
            continue
        matched += 1
        bucket = bands.setdefault(score.category, {"services": 0, "conceptions": 0})
        bucket["services"] += 1
        if unit.is_successful:
            bucket["conceptions"] += 1

    return {
        "bands": {
            name: {
                "services": bucket["services"],
                "conceptions": bucket["conceptions"],
                "rate_pct": round(bucket["conceptions"] * 100 / bucket["services"], 1),
            }
            for name, bucket in sorted(bands.items())
        },
        "coverage_pct": round(matched * 100 / len(resolved), 1),
        "matched_services": matched,
    }


def _scores_by_animal(finca_id: int, period_start: date) -> dict[int, list]:
    """Mediciones de la finca ordenadas por fecha, agrupadas por animal."""
    since = period_start - timedelta(days=BCS_LOOKBACK_DAYS)
    records = (
        BodyConditionScore.query.filter(
            BodyConditionScore.finca_id == finca_id,
            BodyConditionScore.score_date >= since,
        )
        .order_by(BodyConditionScore.score_date.asc())
        .all()
    )
    grouped: dict[int, list] = {}
    for record in records:
        grouped.setdefault(record.animal_id, []).append(record)
    return grouped


def _score_for(records: list, service_date: date):
    """Última medición vigente en la ventana previa al servicio."""
    floor = service_date - timedelta(days=BCS_LOOKBACK_DAYS)
    candidates = [r for r in records if floor <= r.score_date <= service_date]
    return candidates[-1] if candidates else None
