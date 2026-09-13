import datetime as dt
import logging

import flask
from flask import jsonify
from flask_restx import Resource
from flask_jwt_extended import jwt_required

from app import db
from app.models.animalDiseases import AnimalDiseases
from app.utils.response_handler import APIResponse
from app.utils.namespace_helpers import (
    create_optimized_namespace,
    _cache_clear,
    _detail_cache_clear,
)

logger = logging.getLogger(__name__)

animal_diseases_ns = create_optimized_namespace(
    "animal-diseases",
    description="Gestión de enfermedades de animales",
    model_class=AnimalDiseases,
    rbac_entity="animal-diseases",
)


def _json_response(payload, status):
    """Devuelve una Response lista para Flask-RESTX (objeto, no tupla)."""
    from flask import make_response

    return make_response(jsonify(payload), status)


@animal_diseases_ns.route("/case-options")
class AnimalDiseaseCaseOptions(Resource):
    """Opciones de vinculación de caso clínico (selectores de tratamientos).

    Devuelve los episodios del tenant etiquetados por el tipo de registros
    vinculados: Tratamiento (tratamientos), Vacuna (vacunaciones) o
    Recomendación profesional (recomendaciones veterinarias). Un episodio
    puede traer varios tipos; sin registros vinculados vuelve con lista
    vacía (el cliente lo trata como Tratamiento, el caso por defecto).
    """

    @jwt_required()
    @animal_diseases_ns.doc(
        "get_animal_disease_case_options",
        description="Episodios para el selector de caso clínico: id, etiquetas "
        "del animal y enfermedad, estado, gravedad y tipos de registros "
        "vinculados (Tratamiento, Vacuna, Recomendación profesional)",
    )
    def get(self):
        try:
            from sqlalchemy import exists

            from app.models.animals import Animals
            from app.models.diseases import Diseases
            from app.models.treatments import Treatments
            from app.models.treatment_recommendations import (
                TreatmentRecommendations,
            )
            from app.models.vaccinations import Vaccinations
            from app.utils.tenant_context import apply_tenant_filter

            has_treatments = exists().where(
                Treatments.animal_disease_id == AnimalDiseases.id,
                Treatments.is_deleted.is_(False),
            )
            has_vaccinations = exists().where(
                Vaccinations.animal_disease_id == AnimalDiseases.id,
                Vaccinations.is_deleted.is_(False),
            )
            has_recommendations = exists().where(
                TreatmentRecommendations.animal_disease_id == AnimalDiseases.id,
                TreatmentRecommendations.is_deleted.is_(False),
            )

            query = apply_tenant_filter(AnimalDiseases.query, AnimalDiseases).filter(
                AnimalDiseases.is_deleted.is_(False)
            )

            rows = (
                query.with_entities(
                    AnimalDiseases.id,
                    AnimalDiseases.animal_id,
                    Animals.record.label("animal_label"),
                    Diseases.name.label("disease_label"),
                    AnimalDiseases.status,
                    AnimalDiseases.severity,
                    has_treatments.label("has_treatments"),
                    has_vaccinations.label("has_vaccinations"),
                    has_recommendations.label("has_recommendations"),
                )
                .outerjoin(Animals, AnimalDiseases.animal_id == Animals.id)
                .outerjoin(Diseases, AnimalDiseases.disease_id == Diseases.id)
                .order_by(AnimalDiseases.diagnosis_date.desc())
                .limit(5000)
                .all()
            )

            data = [
                {
                    "id": row.id,
                    "animal_id": row.animal_id,
                    "animal_label": row.animal_label,
                    "disease_label": row.disease_label,
                    "status": row.status,
                    "severity": row.severity,
                    "case_types": [
                        case_type
                        for case_type, present in (
                            ("Tratamiento", row.has_treatments),
                            ("Vacuna", row.has_vaccinations),
                            (
                                "Recomendación profesional",
                                row.has_recommendations,
                            ),
                        )
                        if present
                    ],
                }
                for row in rows
            ]
            body, status = APIResponse.success(
                data=data,
                message="Opciones de caso clínico obtenidas exitosamente",
            )
            return _json_response(body, status)
        except Exception as e:
            logger.error(
                f"Error obteniendo opciones de caso clínico: {e}",
                exc_info=True,
            )
            body, status = APIResponse.error(
                message=f"Error al obtener las opciones: {str(e)}",
                status_code=500,
            )
            return _json_response(body, status)


@animal_diseases_ns.route("/<int:record_id>/followup")
class AnimalDiseaseFollowup(Resource):
    @jwt_required()
    @animal_diseases_ns.doc(
        "get_followup_animal_disease",
        description="Seguimiento completo del episodio: avances, tratamientos, "
        "vacunaciones, recomendaciones, controles y serie para gráficos",
    )
    def get(self, record_id: int):
        try:
            from app.services.analytics.medical.disease_followup import (
                get_disease_followup,
            )

            data = get_disease_followup(record_id)
            if data is None:
                body, status = APIResponse.not_found("Episodio de enfermedad")
                return _json_response(body, status)
            body, status = APIResponse.success(
                data=data,
                message="Seguimiento del episodio obtenido exitosamente",
            )
            return _json_response(body, status)
        except Exception as e:
            logger.error(
                f"Error obteniendo seguimiento de episodio {record_id}: {e}",
                exc_info=True,
            )
            body, status = APIResponse.error(
                message=f"Error al obtener el seguimiento: {str(e)}",
                status_code=500,
            )
            return _json_response(body, status)


@animal_diseases_ns.route("/<int:record_id>/followup/close")
class AnimalDiseaseClose(Resource):
    @jwt_required()
    @animal_diseases_ns.doc(
        "post_close_animal_disease",
        description="Cierra el caso: marca el episodio con el estado de "
        "recuperación y la fecha de alta (recovery_date)",
    )
    def post(self, record_id: int):
        try:
            payload = flask.request.get_json(silent=True) or {}
            episode = AnimalDiseases.get_by_id(record_id)
            if not episode:
                body, status = APIResponse.not_found("Episodio de enfermedad")
                return _json_response(body, status)

            resolved_status = payload.get("status") or "Recuperado"
            if resolved_status not in AnimalDiseases.RESOLVED_STATUSES:
                body, status = APIResponse.validation_error(
                    {
                        "status": "El estado de cierre debe ser uno de: "
                        + ", ".join(AnimalDiseases.RESOLVED_STATUSES)
                    }
                )
                return _json_response(body, status)

            recovery_date = payload.get("recovery_date")
            if recovery_date:
                recovery_date = dt.date.fromisoformat(str(recovery_date).split("T")[0])
            else:
                recovery_date = dt.date.today()
            if recovery_date < episode.diagnosis_date:
                body, status = APIResponse.validation_error(
                    {
                        "recovery_date": (
                            "La fecha de alta no puede ser anterior al diagnóstico"
                        )
                    }
                )
                return _json_response(body, status)

            episode.update(status=resolved_status, recovery_date=recovery_date)

            _cache_clear("AnimalDiseases")
            _detail_cache_clear("AnimalDiseases", episode.id)

            body, status = APIResponse.success(
                data=episode.to_namespace_dict(include_relations=True),
                message="Caso cerrado: la res ya está registrada como recuperada",
            )
            return _json_response(body, status)

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error cerrando episodio {record_id}: {e}", exc_info=True)
            body, status = APIResponse.error(
                message=f"Error al cerrar el caso: {str(e)}",
                status_code=500,
            )
            return _json_response(body, status)
