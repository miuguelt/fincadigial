import flask
from flask_jwt_extended import jwt_required
from flask_restx import Namespace, Resource, fields

from app.models.base_model import ValidationError
from app.services.treatment_recommendation_control_service import (
    TreatmentRecommendationControlService,
)
from app.services.treatment_recommendation_service import TreatmentRecommendationService
from app.services.treatment_recommendation_serializer import (
    TreatmentRecommendationSerializer,
)
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import (
    get_current_finca_id,
    get_current_user_id,
    get_current_user_role,
)


treatment_recommendations_ns = Namespace(
    "treatment-recommendations",
    description="Recomendaciones y manejo veterinario sin insumos",
    path="/treatment-recommendations",
)

recommendation_model = treatment_recommendations_ns.model(
    "TreatmentRecommendation",
    {
        "animal_id": fields.Integer(required=True),
        "title": fields.String(required=True),
        "recommendation": fields.String(required=True),
        "responsible": fields.String,
        "start_date": fields.String(required=True),
        "estimated_end_date": fields.String,
        "duration_days": fields.Integer,
        "control_interval_days": fields.Integer(required=True),
        "status": fields.String(enum=["en_curso", "completado", "suspendido"]),
        "final_notes": fields.String,
        "finca_id": fields.Integer,
    },
)
control_update_model = treatment_recommendations_ns.model(
    "TreatmentRecommendationControlUpdate",
    {
        "completed": fields.Boolean,
        "control_date": fields.String,
        "observation": fields.String,
    },
)


def _write_finca_id(data: dict) -> int | None:
    current_finca_id = get_current_finca_id()
    if current_finca_id:
        return current_finca_id
    if get_current_user_role() == "Administrador":
        return data.get("finca_id")
    return None


@treatment_recommendations_ns.route("/")
class TreatmentRecommendationListResource(Resource):
    @jwt_required()
    def get(self):
        args = flask.request.args
        page = max(args.get("page", 1, type=int) or 1, 1)
        limit = min(max(args.get("limit", 20, type=int) or 20, 1), 100)
        pagination = TreatmentRecommendationService.list_recommendations(
            page=page,
            limit=limit,
            animal_id=args.get("animal_id", type=int),
            status=args.get("status"),
            search=args.get("search"),
        )
        return APIResponse.paginated_success(
            data=[
                TreatmentRecommendationSerializer.serialize_recommendation(
                    item, include_next_control=True
                )
                for item in pagination.items
            ],
            page=page,
            limit=limit,
            total_items=pagination.total,
            message="Recomendaciones veterinarias obtenidas",
        )

    @treatment_recommendations_ns.expect(recommendation_model)
    @jwt_required()
    def post(self):
        data = flask.request.get_json(silent=True) or {}
        finca_id = _write_finca_id(data)
        if not finca_id:
            raise ValidationError(
                "Selecciona una finca antes de registrar la recomendación"
            )
        recommendation = TreatmentRecommendationService.create_recommendation(
            data,
            finca_id=finca_id,
            user_id=get_current_user_id(),
        )
        return APIResponse.success(
            TreatmentRecommendationSerializer.serialize_recommendation(
                recommendation, True
            ),
            "Recomendación veterinaria creada",
            status_code=201,
        )


@treatment_recommendations_ns.route("/<int:recommendation_id>")
class TreatmentRecommendationResource(Resource):
    @jwt_required()
    def get(self, recommendation_id: int):
        recommendation = TreatmentRecommendationService.get_recommendation(
            recommendation_id
        )
        return APIResponse.success(
            TreatmentRecommendationSerializer.serialize_recommendation(
                recommendation, True
            ),
            "Recomendación veterinaria obtenida",
        )

    @treatment_recommendations_ns.expect(recommendation_model)
    @jwt_required()
    def put(self, recommendation_id: int):
        data = flask.request.get_json(silent=True) or {}
        recommendation = TreatmentRecommendationService.update_recommendation(
            recommendation_id,
            data,
            finca_id=get_current_finca_id(),
            user_id=get_current_user_id(),
        )
        return APIResponse.success(
            TreatmentRecommendationSerializer.serialize_recommendation(
                recommendation, True
            ),
            "Recomendación veterinaria actualizada",
        )

    @jwt_required()
    def delete(self, recommendation_id: int):
        TreatmentRecommendationService.delete_recommendation(recommendation_id)
        return APIResponse.success(message="Recomendación veterinaria eliminada")


@treatment_recommendations_ns.route("/<int:recommendation_id>/controls")
class TreatmentRecommendationControlListResource(Resource):
    @jwt_required()
    def get(self, recommendation_id: int):
        controls = TreatmentRecommendationControlService.list_controls(
            recommendation_id
        )
        return APIResponse.success(
            [
                TreatmentRecommendationSerializer.serialize_control(item)
                for item in controls
            ],
            "Controles de seguimiento obtenidos",
        )


@treatment_recommendations_ns.route(
    "/<int:recommendation_id>/controls/<int:control_id>"
)
class TreatmentRecommendationControlResource(Resource):
    @jwt_required()
    def get(self, recommendation_id: int, control_id: int):
        control = TreatmentRecommendationControlService.get_control(
            recommendation_id, control_id
        )
        return APIResponse.success(
            TreatmentRecommendationSerializer.serialize_control(control),
            "Control de seguimiento obtenido",
        )

    @treatment_recommendations_ns.expect(control_update_model)
    @jwt_required()
    def put(self, recommendation_id: int, control_id: int):
        data = flask.request.get_json(silent=True) or {}
        control = TreatmentRecommendationControlService.update_control(
            recommendation_id,
            control_id,
            data,
            get_current_user_id(),
        )
        return APIResponse.success(
            TreatmentRecommendationSerializer.serialize_control(control),
            "Control de seguimiento actualizado",
        )
