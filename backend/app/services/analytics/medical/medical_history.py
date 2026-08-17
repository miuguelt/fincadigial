"""Clinical timeline of one animal.

Every source (treatments, vaccinations, checkups, reproductive events,
diagnoses) is turned into the same timeline entry shape and merged into one
chronological list, so the screen does not have to know five formats.
"""

from datetime import date, datetime

from sqlalchemy import desc

from app import db

from .ica_compliance import check_animal_ica

# Alertas mostradas junto al historial. No se paginan: son el aviso de arriba,
# no la lista completa.
_ALERTS_SHOWN = 20


def _parse_date(value):
    if isinstance(value, str):
        return datetime.strptime(value, "%Y-%m-%d").date()
    return value


def _entry(kind: str, when, title: str, subtitle: str, color: str, icon: str) -> dict:
    return {
        "type": kind,
        "date": when.isoformat() if when else "",
        "title": title,
        "subtitle": subtitle,
        "color": color,
        "icon": icon,
    }


def _treatment_entries(treatments) -> list[dict]:
    return [
        _entry(
            "treatment",
            item.treatment_date,
            item.description,
            f"Dosis: {item.dosis} | Frecuencia: {item.frequency}",
            "red",
            "💊",
        )
        for item in treatments
    ]


def _vaccination_entries(vaccinations) -> list[dict]:
    return [
        _entry(
            "vaccination",
            item.vaccination_date,
            f"Vacunación: {item.vaccines.name if item.vaccines else 'N/D'}",
            "",
            "green",
            "💉",
        )
        for item in vaccinations
    ]


def _control_entries(controls) -> list[dict]:
    entries = []
    for item in controls:
        status = item.health_status.value if item.health_status else "N/D"
        parts = [
            f"Peso: {item.weight} kg" if item.weight else "",
            item.description or "",
        ]
        entries.append(
            _entry(
                "control",
                item.checkup_date,
                f"Control Veterinario — {status}",
                " | ".join(filter(None, parts)),
                "blue",
                "⚕️",
            )
        )
    return entries


def _genetic_entries(genetics) -> list[dict]:
    # Ojo con el nombre del iterador: aquí hubo un `for flask.g in genetics`
    # que reemplazaba el global de aplicación de Flask por un registro.
    return [
        _entry(
            "reproductive",
            event.date,
            event.genetic_event_technique,
            f"{event.details} → {event.results}",
            "purple",
            "🐄",
        )
        for event in genetics
    ]


def _disease_entries(diseases) -> list[dict]:
    entries = []
    for item in diseases:
        name = item.disease.name if item.disease else "N/D"
        notes = f" | {item.notes}" if item.notes else ""
        entries.append(
            _entry(
                "disease",
                item.diagnosis_date,
                f"Diagnóstico: {name}",
                f"Estado: {item.status}{notes}",
                "orange",
                "🏥",
            )
        )
    return entries


def get_animal_medical_history(
    animal_id, limit=50, start_date=None, end_date=None
) -> dict | None:
    """Historial clínico completo de un animal, o `None` si no existe."""
    from app.models.alerts import AnimalAlert
    from app.models.animalDiseases import AnimalDiseases
    from app.models.animals import Animals
    from app.models.control import Control
    from app.models.geneticImprovements import GeneticImprovements
    from app.models.treatments import Treatments
    from app.models.vaccinations import Vaccinations

    animal = db.session.get(Animals, animal_id)
    if not animal:
        return None

    start_date = _parse_date(start_date)
    end_date = _parse_date(end_date)

    def in_range(query, column):
        if start_date:
            query = query.filter(column >= start_date)
        if end_date:
            query = query.filter(column <= end_date)
        return query

    # Las consultas base quedan sin límite para que `summary` cuente el
    # historial real y no repita el tamaño de página.
    treatments_q = in_range(
        Treatments.query.filter_by(animal_id=animal_id), Treatments.treatment_date
    )
    vaccinations_q = in_range(
        Vaccinations.query.filter_by(animal_id=animal_id), Vaccinations.vaccination_date
    )
    controls_q = in_range(
        Control.query.filter_by(animal_id=animal_id), Control.checkup_date
    )
    genetics_q = in_range(
        GeneticImprovements.query.filter_by(animal_id=animal_id),
        GeneticImprovements.date,
    )
    diseases_q = AnimalDiseases.query.filter_by(animal_id=animal_id)
    alerts_q = AnimalAlert.query.filter_by(animal_id=animal_id, superseded_by_id=None)

    timeline = [
        *_treatment_entries(
            treatments_q.order_by(desc(Treatments.treatment_date)).limit(limit).all()
        ),
        *_vaccination_entries(
            vaccinations_q.order_by(desc(Vaccinations.vaccination_date))
            .limit(limit)
            .all()
        ),
        *_control_entries(
            controls_q.order_by(desc(Control.checkup_date)).limit(limit).all()
        ),
        *_genetic_entries(
            genetics_q.order_by(desc(GeneticImprovements.date)).limit(limit).all()
        ),
        *_disease_entries(
            diseases_q.order_by(desc(AnimalDiseases.diagnosis_date)).limit(limit).all()
        ),
    ]
    timeline.sort(key=lambda item: item["date"] or "", reverse=True)

    alerts = (
        alerts_q.order_by(desc(AnimalAlert.triggered_at)).limit(_ALERTS_SHOWN).all()
    )

    return {
        "animal_info": {
            "id": animal.id,
            "record": animal.record,
            "status": animal.status.value,
            "sex": animal.sex.value if animal.sex else None,
            "age_months": animal.age_in_months,
            "weight": animal.weight,
        },
        "summary": {
            "total_treatments": treatments_q.count(),
            "total_vaccinations": vaccinations_q.count(),
            "total_controls": controls_q.count(),
            "total_reproductive": genetics_q.count(),
            "total_diseases": diseases_q.count(),
            "unread_alerts": alerts_q.filter(AnimalAlert.is_read.is_(False)).count(),
        },
        "ica_compliance": check_animal_ica(animal_id, date.today()),
        "alerts": [
            {
                "message": alert.message,
                "priority": alert.priority.value,
                "type": alert.alert_type.value,
                "is_read": alert.is_read,
                "date": alert.triggered_at.date().isoformat()
                if alert.triggered_at
                else None,
            }
            for alert in alerts
        ],
        "timeline": timeline[:limit],
    }
