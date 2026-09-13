"""Analítica de episodios de enfermedad y variación de peso por animal.

Módulos consultados por /analytics/health/statistics y
/analytics/health/weight-deltas. Centraliza las agregaciones para que el
namespace de analítica sea un controlador delgado y las consultas sean
probables de forma aislada.
"""

from datetime import datetime, timedelta

from sqlalchemy import extract, func

from app import db
from app.models.animalDiseases import AnimalDiseases
from app.models.control import Control
from app.utils.tenant_context import apply_tenant_filter


def _tf(query, model_class):
    return apply_tenant_filter(query, model_class)


def build_weight_deltas(animal_ids: list[int]) -> dict[str, dict]:
    """Variación entre los dos últimos controles con peso de cada animal."""
    results: dict[str, dict] = {}
    for animal_id in animal_ids:
        controls = (
            _tf(Control.query.filter_by(animal_id=animal_id), Control)
            .filter(
                Control.is_deleted == False, Control.weight.isnot(None)  # noqa: E712
            )
            .order_by(Control.checkup_date.desc(), Control.id.desc())
            .limit(2)
            .all()
        )
        if not controls:
            continue
        latest = controls[0]
        entry = {
            "latest_weight": latest.weight,
            "prev_weight": None,
            "delta_pct": None,
            "delta_kg": None,
            "last_checkup_date": latest.checkup_date.isoformat(),
        }
        if len(controls) >= 2 and controls[1].weight and controls[1].weight > 0:
            delta_kg = round(latest.weight - controls[1].weight, 2)
            entry["prev_weight"] = controls[1].weight
            entry["delta_kg"] = delta_kg
            entry["delta_pct"] = round((delta_kg / controls[1].weight) * 100, 1)
        results[str(animal_id)] = entry
    return results


def build_episode_stats(
    animal_id: int | str | None = None, months_back: int = 12
) -> dict:
    """Agregados de episodios de enfermedad para el panel sanitario."""
    start_date = datetime.now() - timedelta(days=months_back * 30)
    if animal_id is not None:
        animal_id = int(animal_id)

    episodes_q = _tf(
        db.session.query(AnimalDiseases), AnimalDiseases
    ).filter(AnimalDiseases.is_deleted == False)  # noqa: E712
    if animal_id:
        episodes_q = episodes_q.filter(AnimalDiseases.animal_id == animal_id)
    episodes = episodes_q.all()

    total_episodes = len(episodes)
    resolved_episodes = [ep for ep in episodes if ep.recovery_date is not None]
    open_episodes = [ep for ep in episodes if ep.recovery_date is None]

    by_status: dict[str, int] = {}
    by_severity: dict[str, int] = {}
    for ep in episodes:
        status_key = ep.status or "Sin estado"
        by_status[status_key] = by_status.get(status_key, 0) + 1
        severity_key = ep.severity or "No registrada"
        by_severity[severity_key] = by_severity.get(severity_key, 0) + 1

    durations = [
        (ep.recovery_date - ep.diagnosis_date).days for ep in resolved_episodes
    ]
    avg_duration = (
        round(sum(durations) / len(durations), 1) if durations else None
    )

    avg_by_disease: dict[str, list[float]] = {}
    for ep in resolved_episodes:
        name = ep.disease.name if ep.disease else "Sin catalogar"
        avg_by_disease.setdefault(name, []).append(
            (ep.recovery_date - ep.diagnosis_date).days
        )
    avg_duration_by_disease = sorted(
        (
            {
                "disease": name,
                "avg_days": round(sum(values) / len(values), 1),
                "cases": len(values),
            }
            for name, values in avg_by_disease.items()
        ),
        key=lambda item: item["cases"],
        reverse=True,
    )[:10]

    by_month_query = _tf(
        db.session.query(
            extract("year", AnimalDiseases.diagnosis_date).label("year"),
            extract("month", AnimalDiseases.diagnosis_date).label("month"),
            func.count(AnimalDiseases.id).label("count"),
        ),
        AnimalDiseases,
    ).filter(
        AnimalDiseases.diagnosis_date >= start_date,
        AnimalDiseases.is_deleted == False,  # noqa: E712
    )
    if animal_id:
        by_month_query = by_month_query.filter(AnimalDiseases.animal_id == animal_id)
    by_month = (
        by_month_query.group_by(
            extract("year", AnimalDiseases.diagnosis_date),
            extract("month", AnimalDiseases.diagnosis_date),
        )
        .order_by("year", "month")
        .all()
    )

    recovery_rate = (
        round((len(resolved_episodes) / total_episodes) * 100, 1)
        if total_episodes
        else None
    )

    return {
        "total": total_episodes,
        "active": len(open_episodes),
        "resolved": len(resolved_episodes),
        "recovery_rate": recovery_rate,
        "avg_duration_days": avg_duration,
        "by_month": [
            {"period": f"{int(y)}-{int(m):02d}", "count": c}
            for y, m, c in by_month
        ],
        "by_status": by_status,
        "by_severity": by_severity,
        "avg_duration_by_disease": avg_duration_by_disease,
    }
