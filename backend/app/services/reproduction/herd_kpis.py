"""Panel de indicadores reproductivos del hato.

Agrega las series individuales en los indicadores que una finca usa para
decidir: intervalo entre partos, días abiertos, servicios por concepción,
detección de celo y tasa de preñez, junto al inventario reproductivo, las
listas de atención y la proyección de partos y secados.
"""

from datetime import date, timedelta
from statistics import median

from app.models.animals import Animals, AnimalStatus, Sex

from .body_condition_link import conception_by_body_condition
from .cycle_rules import TARGETS, load_rules, status_for
from .female_metrics import (
    DAYS_PER_MONTH,
    build_female_metrics,
    load_first_calving_dates,
)
from .heat_detection import heat_detection_rate, pregnancy_rate
from .outcome_stats import outcome_summary
from .pregnancy_resolver import CONFIRMED, PENDING, build_service_units, load_timelines
from .risk_lists import build_risk_lists

MAX_PERIOD_MONTHS = 60


def build_herd_kpis(finca_id: int, months: int = 12) -> dict:
    """Construye el panel reproductivo completo de una finca."""
    period_months = min(max(months, 1), MAX_PERIOD_MONTHS)
    today = date.today()
    period_start = today - timedelta(days=int(period_months * DAYS_PER_MONTH))
    rules = load_rules(finca_id)

    females = _females(finca_id)
    # Se carga una gestación completa antes del período para poder emparejar
    # servicios cuyo parto o diagnóstico cae dentro de la ventana consultada.
    lookback = period_start - timedelta(days=rules.gestation_days + 60)
    timelines = load_timelines(finca_id, since=lookback)
    units = build_service_units(list(females), finca_id, rules, timelines)
    first_calvings = load_first_calving_dates(finca_id)
    metrics = {
        animal_id: build_female_metrics(
            animal,
            timelines.get(animal_id),
            units.get(animal_id, []),
            rules,
            today,
            first_calvings.get(animal_id),
        )
        for animal_id, animal in females.items()
    }

    outcomes = outcome_summary(units, timelines, females, period_start)
    detection_pct, heats_seen, opportunities = heat_detection_rate(
        females, timelines, units, rules, period_start, today
    )
    efficiency = _efficiency(metrics, outcomes, period_start)
    efficiency["conception_by_body_condition"] = conception_by_body_condition(
        units, finca_id, period_start
    )
    efficiency["heat_detection_rate_pct"] = detection_pct
    efficiency["observed_heats"] = heats_seen
    efficiency["heat_opportunities"] = opportunities
    efficiency["pregnancy_rate_pct"] = pregnancy_rate(
        detection_pct, efficiency["conception_rate_pct"]
    )

    return {
        "period_months": period_months,
        "as_of": today.isoformat(),
        "targets": TARGETS,
        "inventory": _inventory(females, metrics),
        "efficiency": efficiency,
        "risk": build_risk_lists(females, metrics, units, rules, today),
        "projection": _projection(units, today),
        "status": {
            key: status_for(key, efficiency.get(key, {}).get("avg")
                            if isinstance(efficiency.get(key), dict)
                            else efficiency.get(key))
            for key in TARGETS
        },
    }


def _females(finca_id: int) -> dict[int, Animals]:
    animals = Animals.query.filter(
        Animals.finca_id == finca_id,
        Animals.sex == Sex.Hembra,
        Animals.status == AnimalStatus.Vivo,
    ).all()
    return {animal.id: animal for animal in animals}


def _series(values: list, metric: str) -> dict:
    """Resumen estadístico de una serie con su meta y semáforo."""
    if not values:
        return {"avg": None, "median": None, "min": None, "max": None, "n": 0,
                "target": TARGETS.get(metric, {}).get("target"), "status": None}
    average = round(sum(values) / len(values), 1)
    return {
        "avg": average,
        "median": round(median(values), 1),
        "min": round(min(values), 1),
        "max": round(max(values), 1),
        "n": len(values),
        "target": TARGETS.get(metric, {}).get("target"),
        "status": status_for(metric, average),
    }


def _efficiency(metrics: dict, outcomes: dict, period_start: date) -> dict:
    """Indicadores agregados de eficiencia reproductiva."""
    collected = {
        "calving_interval_days": [],
        "days_open": [],
        "calving_to_first_service_days": [],
        "services_per_conception": [],
        "age_at_first_calving_months": [],
    }
    for metric in metrics.values():
        collected["calving_interval_days"].extend(metric.calving_intervals)
        collected["days_open"].extend(metric.days_open)
        collected["calving_to_first_service_days"].extend(metric.calving_to_first_service)
        collected["services_per_conception"].extend(metric.services_per_conception)
        # La edad al primer parto solo cuenta para la cohorte que estrenó
        # maternidad dentro del período; si no, se repetiría año tras año.
        if (
            metric.age_at_first_calving_months is not None
            and metric.first_calving_date is not None
            and metric.first_calving_date >= period_start
        ):
            collected["age_at_first_calving_months"].append(
                metric.age_at_first_calving_months
            )

    efficiency = {name: _series(values, name) for name, values in collected.items()}
    efficiency.update(outcomes)
    return efficiency


def _inventory(females: dict[int, Animals], metrics: dict) -> dict:
    """Composición reproductiva del hato en el momento de la consulta."""
    counters = {
        "total_females": len(females),
        "pregnant": 0,
        "served_pending": 0,
        "open": 0,
        "heifers": 0,
        "lactating": 0,
    }
    for animal_id, metric in metrics.items():
        counters["pregnant" if metric.state == "preñada" else
                 "served_pending" if metric.state == "servida" else
                 "open" if metric.state == "vacía" else "heifers"] += 1
        if females[animal_id].is_lactating:
            counters["lactating"] += 1
    counters["breeding_females"] = counters["total_females"] - counters["heifers"]
    return counters


def _projection(units: dict, today: date) -> dict:
    """Partos y secados esperados mes a mes a partir de las preñeces vigentes."""
    births: dict[str, int] = {}
    dry_offs: dict[str, int] = {}
    for animal_units in units.values():
        if not animal_units:
            continue
        last = animal_units[-1]
        if last.outcome not in (CONFIRMED, PENDING):
            continue
        if last.expected_birth_date < today:
            continue
        births[last.expected_birth_date.strftime("%Y-%m")] = (
            births.get(last.expected_birth_date.strftime("%Y-%m"), 0) + 1
        )
        dry_off = last.expected_birth_date - timedelta(days=60)
        if dry_off >= today:
            dry_offs[dry_off.strftime("%Y-%m")] = (
                dry_offs.get(dry_off.strftime("%Y-%m"), 0) + 1
            )
    return {
        "births_by_month": dict(sorted(births.items())),
        "dry_offs_by_month": dict(sorted(dry_offs.items())),
    }
