"""Desempeño reproductivo de toros calculado desde eventos de la finca."""

from collections import defaultdict
from datetime import date, timedelta

from app.models.animals import Animals, AnimalStatus, Sex
from app.models.reproduction import DiagnosisResult, EventType, Offspring, ReproductiveEvent


def _rate(numerator: int, denominator: int) -> float:
    return round(numerator * 100 / denominator, 1) if denominator else 0.0


class SirePerformanceService:
    """Agrupa eventos en memoria después de dos consultas acotadas por finca."""

    @staticmethod
    def get_performance(finca_id: int, months: int = 12) -> dict:
        period_months = min(max(months, 1), 24)
        since = date.today() - timedelta(days=period_months * 31)
        sires = Animals.query.filter_by(
            finca_id=finca_id,
            sex=Sex.Macho,
            status=AnimalStatus.Vivo,
        ).all()
        sire_by_id = {sire.id: sire for sire in sires}
        events = ReproductiveEvent.query.filter(
            ReproductiveEvent.finca_id == finca_id,
            ReproductiveEvent.event_date >= since,
        ).order_by(ReproductiveEvent.event_date.asc(), ReproductiveEvent.id.asc()).all()

        stats = defaultdict(lambda: {
            "inseminations": 0,
            "positive_diagnoses": 0,
            "total_offspring": 0,
        })
        last_insemination: dict[int, ReproductiveEvent] = {}
        confirmed: set[int] = set()
        birth_sires: dict[int, int] = {}

        for event in events:
            if event.event_type == EventType.Inseminacion:
                last_insemination[event.animal_id] = event
                if event.sire_id in sire_by_id:
                    stats[event.sire_id]["inseminations"] += 1
            elif (
                event.event_type == EventType.Diagnostico
                and event.diagnosis_result == DiagnosisResult.Positivo
            ):
                source = last_insemination.get(event.animal_id)
                if source and source.id not in confirmed and source.sire_id in sire_by_id:
                    confirmed.add(source.id)
                    stats[source.sire_id]["positive_diagnoses"] += 1
            elif event.event_type == EventType.Parto and event.sire_id in sire_by_id:
                stats[event.sire_id]["total_offspring"] += event.alive_count or 0
                birth_sires[event.id] = event.sire_id

        weights: dict[int, list[float]] = defaultdict(list)
        if birth_sires:
            offspring = Offspring.query.filter(
                Offspring.finca_id == finca_id,
                Offspring.birth_event_id.in_(birth_sires),
                Offspring.birth_weight.isnot(None),
            ).all()
            for item in offspring:
                weights[birth_sires[item.birth_event_id]].append(item.birth_weight)

        performance = []
        for sire_id, values in stats.items():
            sire = sire_by_id[sire_id]
            sire_weights = weights.get(sire_id, [])
            performance.append({
                "sire_id": sire_id,
                "record": sire.record,
                "breed": sire.breed.name if sire.breed else None,
                **values,
                "conception_rate_pct": _rate(
                    values["positive_diagnoses"], values["inseminations"]
                ),
                "avg_birth_weight_kg": (
                    round(sum(sire_weights) / len(sire_weights), 1)
                    if sire_weights else None
                ),
            })

        performance.sort(
            key=lambda item: (-item["conception_rate_pct"], item["record"])
        )
        return {"period_months": period_months, "sires": performance}
