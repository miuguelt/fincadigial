"""Métricas de fertilidad calculadas únicamente desde PostgreSQL."""

from collections import defaultdict
from datetime import date

from app.models.animals import Sex
from app.models.reproduction import (
    DiagnosisResult,
    EventType,
    InseminationTechnique,
    ReproductiveEvent,
)


def _month_start(value: date, months_back: int = 0) -> date:
    month_index = value.year * 12 + value.month - 1 - months_back
    return date(month_index // 12, month_index % 12 + 1, 1)


def _rate(numerator: int, denominator: int) -> float:
    return round(numerator * 100 / denominator, 1) if denominator else 0.0


class FertilityAnalyticsService:
    """Construye el contrato del resumen de fertilidad por finca."""

    @staticmethod
    def get_dashboard(finca_id: int, months: int = 6) -> dict:
        period_months = min(max(months, 1), 24)
        today = date.today()
        period_start = _month_start(today, period_months - 1)
        events = (
            ReproductiveEvent.query.filter(
                ReproductiveEvent.finca_id == finca_id,
                ReproductiveEvent.event_date >= period_start,
                ReproductiveEvent.event_date <= today,
            )
            .order_by(ReproductiveEvent.event_date.asc(), ReproductiveEvent.id.asc())
            .all()
        )

        month_keys = [
            _month_start(today, offset).strftime("%Y-%m")
            for offset in range(period_months - 1, -1, -1)
        ]
        events_by_month = dict.fromkeys(month_keys, 0)
        inseminations_by_animal: dict[int, int] = defaultdict(int)
        positives_by_animal: dict[int, int] = defaultdict(int)
        technique_totals: dict[InseminationTechnique, int] = defaultdict(int)
        technique_positives: dict[InseminationTechnique, int] = defaultdict(int)
        last_insemination: dict[int, ReproductiveEvent] = {}
        confirmed_inseminations: set[int] = set()
        birth_dates: dict[int, list[date]] = defaultdict(list)
        total_alive = 0
        total_dead = 0

        for event in events:
            if event.event_type == EventType.Inseminacion:
                events_by_month[event.event_date.strftime("%Y-%m")] += 1
                inseminations_by_animal[event.animal_id] += 1
                last_insemination[event.animal_id] = event
                if event.technique:
                    technique_totals[event.technique] += 1
            elif (
                event.event_type == EventType.Diagnostico
                and event.diagnosis_result == DiagnosisResult.Positivo
            ):
                source = last_insemination.get(event.animal_id)
                if source and source.id not in confirmed_inseminations:
                    confirmed_inseminations.add(source.id)
                    positives_by_animal[event.animal_id] += 1
                    if source.technique:
                        technique_positives[source.technique] += 1
            elif event.event_type == EventType.Parto:
                birth_dates[event.animal_id].append(event.event_date)
                total_alive += event.alive_count or 0
                total_dead += event.dead_count or 0

        intervals = [
            (dates[index] - dates[index - 1]).days
            for dates in birth_dates.values()
            for index in range(1, len(dates))
        ]
        rankings = FertilityAnalyticsService._female_rankings(
            events, inseminations_by_animal, positives_by_animal
        )
        total_inseminations = sum(inseminations_by_animal.values())
        total_confirmed = len(confirmed_inseminations)
        total_birth_outcomes = total_alive + total_dead

        return {
            "period_months": period_months,
            "total_inseminations": total_inseminations,
            "conception_rate_pct": _rate(total_confirmed, total_inseminations),
            "conception_by_technique": {
                "natural": _rate(
                    technique_positives[InseminationTechnique.Natural],
                    technique_totals[InseminationTechnique.Natural],
                ),
                "artificial": _rate(
                    technique_positives[InseminationTechnique.Artificial],
                    technique_totals[InseminationTechnique.Artificial],
                ),
            },
            "avg_interval_between_births_days": (
                round(sum(intervals) / len(intervals)) if intervals else 0
            ),
            "perinatal_mortality_rate_pct": _rate(total_dead, total_birth_outcomes),
            "events_by_month": events_by_month,
            "top_females": rankings[:5],
            "bottom_females": list(reversed(rankings[-5:])),
        }

    @staticmethod
    def _female_rankings(
        events: list[ReproductiveEvent],
        inseminations: dict[int, int],
        positives: dict[int, int],
    ) -> list[dict]:
        animals = {
            event.animal_id: event.animal
            for event in events
            if event.animal and event.animal.sex == Sex.Hembra
        }
        rankings = [
            {
                "animal_id": animal_id,
                "record": animals[animal_id].record,
                "inseminations": total,
                "positive": positives.get(animal_id, 0),
                "rate": _rate(positives.get(animal_id, 0), total),
            }
            for animal_id, total in inseminations.items()
            if animal_id in animals
        ]
        return sorted(
            rankings,
            key=lambda item: (-item["rate"], -item["positive"], item["record"]),
        )
