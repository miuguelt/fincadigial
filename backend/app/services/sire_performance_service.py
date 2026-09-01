"""Desempeño reproductivo de toros calculado desde eventos de la finca."""

from collections import defaultdict
from datetime import date, timedelta

from app.models.animals import Animals, AnimalStatus, Sex
from app.models.reproduction import (
    DiagnosisResult,
    EventType,
    Offspring,
    ReproductiveEvent,
)


def _rate(numerator: int, denominator: int) -> float:
    return round(numerator * 100 / denominator, 1) if denominator else 0.0


#: Calificación del reproductor: exige tasa de preñez y volumen mínimo de
#: servicios, para que un toro con un solo acierto no aparezca como élite.
_GRADES = ((70.0, 5, "A"), (60.0, 3, "B"), (50.0, 2, "C"))


def _grade(conception_rate: float, inseminations: int) -> str:
    for min_rate, min_services, label in _GRADES:
        if conception_rate >= min_rate and inseminations >= min_services:
            return label
    return "D"


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
        events = (
            ReproductiveEvent.query.filter(
                ReproductiveEvent.finca_id == finca_id,
                ReproductiveEvent.event_date >= since,
            )
            .order_by(ReproductiveEvent.event_date.asc(), ReproductiveEvent.id.asc())
            .all()
        )

        stats = defaultdict(
            lambda: {
                "inseminations": 0,
                "positive_diagnoses": 0,
                "total_offspring": 0,
            }
        )
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
                if (
                    source
                    and source.id not in confirmed
                    and source.sire_id in sire_by_id
                ):
                    confirmed.add(source.id)
                    stats[source.sire_id]["positive_diagnoses"] += 1
            elif event.event_type == EventType.Parto:
                # El toro del parto puede venir explícito o del servicio que lo engendró
                effective_sire_id = event.sire_id
                if not effective_sire_id and event.animal_id in last_insemination:
                    source_insem = last_insemination[event.animal_id]
                    if source_insem and source_insem.sire_id:
                        effective_sire_id = source_insem.sire_id

                if effective_sire_id and effective_sire_id in sire_by_id:
                    stats[effective_sire_id]["total_offspring"] += event.alive_count or 0
                    birth_sires[event.id] = effective_sire_id

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
            conception_rate = _rate(
                values["positive_diagnoses"], values["inseminations"]
            )
            performance.append(
                {
                    "sire_id": sire_id,
                    "record": sire.record,
                    "breed": sire.breed.name if sire.breed else "---",
                    **values,
                    "conception_rate_pct": conception_rate,
                    "avg_birth_weight_kg": (
                        round(sum(sire_weights) / len(sire_weights), 1)
                        if sire_weights
                        else 0
                    ),
                    "grade": _grade(conception_rate, values["inseminations"]),
                }
            )

        performance.sort(
            key=lambda item: (-item["conception_rate_pct"], item["record"])
        )
        return {"period_months": period_months, "sires": performance}
