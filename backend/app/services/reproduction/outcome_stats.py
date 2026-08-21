"""Tasas derivadas del desenlace de los servicios y de los partos.

Solo cuentan los eventos ocurridos dentro del período consultado; el historial
adicional que carga el resolutor existe únicamente para emparejar servicios que
cruzan el borde del período.
"""

from datetime import date

from app.models.animals import Animals, Sex

from .pregnancy_resolver import (
    ABORTED,
    PENDING,
    AnimalTimeline,
    ServiceUnit,
)


def outcome_summary(
    units: dict[int, list[ServiceUnit]],
    timelines: dict[int, AnimalTimeline],
    females: dict[int, Animals],
    period_start: date,
) -> dict:
    """Tasas de concepción, pérdida y desempeño al parto del período."""
    in_period = [
        unit
        for animal_units in units.values()
        for unit in animal_units
        if unit.service_date >= period_start
    ]
    resolved = [unit for unit in in_period if unit.outcome != PENDING]
    successful = [unit for unit in resolved if unit.is_successful]

    births = [
        birth
        for animal_id, timeline in timelines.items()
        if animal_id in females
        for birth in timeline.births
        if birth.event_date >= period_start
    ]

    return {
        "total_services": len(in_period),
        "resolved_services": len(resolved),
        "pending_services": len(in_period) - len(resolved),
        "confirmed_pregnancies": len(successful),
        "conception_rate_pct": _rate(len(successful), len(resolved)),
        "conception_by_technique": _by_technique(resolved),
        "abortion_rate_pct": _rate(
            sum(1 for unit in successful if unit.outcome == ABORTED), len(successful)
        ),
        **_birth_stats(births),
        "services_by_month": _by_month(unit.service_date for unit in in_period),
        "births_by_month": _by_month(birth.event_date for birth in births),
    }


def _birth_stats(births: list) -> dict:
    """Resultados del parto: crías, mortalidad, complicaciones y gemelares."""
    live = sum(birth.alive_count or 0 for birth in births)
    dead = sum(birth.dead_count or 0 for birth in births)
    born = live + dead
    twins = sum(1 for birth in births if (birth.alive_count or 0) + (birth.dead_count or 0) > 1)
    complications = sum(1 for birth in births if birth.complications)
    male_calves, female_calves = _calf_sex_ratio(births)
    return {
        "total_births": len(births),
        "live_calves": live,
        "dead_calves": dead,
        "perinatal_mortality_pct": _rate(dead, born),
        "twinning_rate_pct": _rate(twins, len(births)),
        "calving_complication_rate_pct": _rate(complications, len(births)),
        "calf_sex_ratio": {"males": male_calves, "females": female_calves},
    }


def _calf_sex_ratio(births: list) -> tuple[int, int]:
    """Sexo de las crías registradas en la tabla de descendencia."""
    males = females = 0
    for birth in births:
        for calf in birth.offspring:
            if calf.sex == Sex.Macho:
                males += 1
            elif calf.sex == Sex.Hembra:
                females += 1
    return males, females


def _by_technique(resolved: list[ServiceUnit]) -> dict:
    """Tasa de concepción discriminada por técnica de servicio."""
    totals: dict[str, dict[str, int]] = {}
    for unit in resolved:
        bucket = totals.setdefault(unit.technique or "sin_registro", {"total": 0, "ok": 0})
        bucket["total"] += 1
        if unit.is_successful:
            bucket["ok"] += 1
    return {
        technique: {
            "services": bucket["total"],
            "conceptions": bucket["ok"],
            "rate_pct": _rate(bucket["ok"], bucket["total"]),
        }
        for technique, bucket in sorted(totals.items())
    }


def _by_month(dates) -> dict[str, int]:
    counts: dict[str, int] = {}
    for value in dates:
        key = value.strftime("%Y-%m")
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items()))


def _rate(numerator: int, denominator: int) -> float | None:
    return round(numerator * 100 / denominator, 1) if denominator else None
