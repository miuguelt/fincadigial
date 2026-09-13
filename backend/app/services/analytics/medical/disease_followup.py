"""Seguimiento completo de un episodio de enfermedad.

Agregar en una sola respuesta todo lo que necesita la pantalla de
seguimiento sanidad: el episodio (con relaciones), la evolución clínica
(avances), y los registros vinculados (tratamientos con medicamentos y
vacunas de puente, vacunaciones, recomendaciones con controles y controles
veterinarios), de modo que el cliente no haga seis llamadas distintas y las
vistas muestren siempre la misma foto del caso.
"""

from datetime import date, datetime

from sqlalchemy import desc

from app import db
from app.utils.tenant_context import apply_tenant_filter


def _iso(value):
    if value is None:
        return None
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    return value


def _treatment_entries(treatments):
    """Tratamientos vinculados al episodio, con sus insumos de puente."""
    entries = []
    for item in treatments:
        medications = [
            {
                "id": link_id,
                "medication_id": link.medication_id,
                "name": getattr(link.medications, "name", None),
                "dosis": getattr(link.medications, "dosis", None),
                "quantity": float(link.quantity) if link.quantity is not None else None,
                "lot_number": getattr(link.lot, "lot_number", None),
            }
            for link_id, link in ((link.id, link) for link in item.medication_treatments)
            if not link.is_deleted
        ]
        vaccines = [
            {
                "id": link_id,
                "vaccine_id": link.vaccine_id,
                "name": getattr(link.vaccines, "name", None),
            }
            for link_id, link in ((link.id, link) for link in item.vaccines_treatments)
            if not link.is_deleted
        ]
        entries.append(
            {
                "id": item.id,
                "treatment_date": _iso(item.treatment_date),
                "description": item.description,
                "frequency": item.frequency,
                "dosis": item.dosis,
                "observations": item.observations,
                "cost": float(item.cost) if item.cost is not None else None,
                "performed_by": item.performed_by,
                "medications": medications,
                "vaccines": vaccines,
            }
        )
    return entries


def _recommendation_entries(recommendations):
    """Recomendaciones veterinarias vinculadas al episodio, con sus controles."""
    entries = []
    for item in recommendations:
        controls = [
            {
                "id": control.id,
                "scheduled_date": _iso(control.scheduled_date),
                "control_date": _iso(control.control_date),
                "observation": control.observation,
                "completed": control.completed,
                "recorded_by": control.recorded_by,
            }
            for control in item.controls
            if not control.is_deleted
        ]
        entries.append(
            {
                "id": item.id,
                "title": item.title,
                "recommendation": item.recommendation,
                "responsible": item.responsible,
                "start_date": _iso(item.start_date),
                "estimated_end_date": _iso(item.estimated_end_date),
                "duration_days": item.duration_days,
                "control_interval_days": item.control_interval_days,
                "status": item.status,
                "final_notes": item.final_notes,
                "controls": controls,
            }
        )
    return entries


def get_disease_followup(episode_id) -> dict | None:
    """Seguimiento completo del episodio, o ``None`` si no existe."""
    from app.models.animalDiseaseProgress import AnimalDiseaseProgress
    from app.models.animalDiseases import AnimalDiseases
    from app.models.control import Control
    from app.models.treatments import Treatments
    from app.models.treatment_recommendations import TreatmentRecommendations
    from app.models.vaccinations import Vaccinations

    episode = AnimalDiseases.get_by_id(episode_id)
    if not episode:
        return None

    progress = (
        apply_tenant_filter(
            AnimalDiseaseProgress.query.filter_by(animal_disease_id=episode_id),
            AnimalDiseaseProgress,
        )
        .filter(AnimalDiseaseProgress.is_deleted == False)  # noqa: E712
        .order_by(desc(AnimalDiseaseProgress.progress_date), desc(AnimalDiseaseProgress.id))
        .all()
    )
    treatments = (
        apply_tenant_filter(
            Treatments.query.filter_by(animal_disease_id=episode_id),
            Treatments,
        )
        .filter(Treatments.is_deleted == False)  # noqa: E712
        .order_by(desc(Treatments.treatment_date))
        .all()
    )
    vaccinations = (
        apply_tenant_filter(
            Vaccinations.query.filter_by(animal_disease_id=episode_id),
            Vaccinations,
        )
        .filter(Vaccinations.is_deleted == False)  # noqa: E712
        .order_by(desc(Vaccinations.vaccination_date))
        .all()
    )
    recommendations = (
        apply_tenant_filter(
            TreatmentRecommendations.query.filter_by(animal_disease_id=episode_id),
            TreatmentRecommendations,
        )
        .filter(TreatmentRecommendations.is_deleted == False)  # noqa: E712
        .order_by(desc(TreatmentRecommendations.start_date))
        .all()
    )
    controls = (
        apply_tenant_filter(
            Control.query.filter_by(animal_disease_id=episode_id),
            Control,
        )
        .filter(Control.is_deleted == False)  # noqa: E712
        .order_by(desc(Control.checkup_date))
        .all()
    )

    # Serie ordenable de peso/temperatura: los avances mandan (son los datos
    # clínicos del caso); si hay controles veterinarios con peso sin avance se
    # integran a la serie para que el gráfico no pierda puntos.
    series = []
    for item in progress:
        series.append(
            {
                "source": "progress",
                "date": _iso(item.progress_date),
                "weight": item.weight,
                "temperature": item.temperature,
                "status": item.status,
                "observation": item.observation,
            }
        )
    for item in controls:
        if item.weight is None:
            continue
        series.append(
            {
                "source": "control",
                "date": _iso(item.checkup_date),
                "weight": item.weight,
                "temperature": None,
                "status": item.health_status.value
                if item.health_status
                else None,
                "observation": item.description,
            }
        )
    series.sort(key=lambda row: row["date"] or "")

    resolved = []
    closed_episode = episode.status in AnimalDiseases.RESOLVED_STATUSES
    if closed_episode:
        resolved.append(
            {
                "code": "CLOSED",
                "message": "El caso ya fue cerrado (estado de recuperación).",
            }
        )
    if episode.recovery_date:
        duration = (episode.recovery_date - episode.diagnosis_date).days
        resolved.append(
            {
                "code": "DURATION",
                "message": f"El caso duró {duration} días.",
                "duration_days": duration,
            }
        )

    return {
        "episode": episode.to_namespace_dict(include_relations=True),
        "progress": [
            {"id": item.id, **item.to_namespace_dict()} for item in progress
        ],
        "treatments": _treatment_entries(treatments),
        "vaccinations": [
            {
                "id": item.id,
                "vaccination_date": _iso(item.vaccination_date),
                "vaccine_id": item.vaccine_id,
                "vaccine_name": getattr(item.vaccines, "name", None),
                "dosis": item.dosis,
                "batch_number": item.batch_number,
                "notes": item.notes,
            }
            for item in vaccinations
        ],
        "recommendations": _recommendation_entries(recommendations),
        "controls": [
            {"id": item.id, **item.to_namespace_dict()} for item in controls
        ],
        "chart": {
            "series": [
                {
                    "date": row["date"],
                    "weight": row["weight"],
                    "temperature": row["temperature"],
                    "status": row["status"],
                    "observation": row["observation"],
                    "source": row["source"],
                }
                for row in series
            ]
        },
        "closed": resolved,
        "status_options": {
            "open": ["Activo", "En tratamiento", "Observación", "Crónico"],
            "resolved": list(AnimalDiseases.RESOLVED_STATUSES),
            "severity": list(AnimalDiseases.SEVERITY_LEVELS),
        },
    }
