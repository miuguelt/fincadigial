from app.models.campesino import (
    CropPlot,
    CropActivity,
    WaterSource,
    WaterMeasurement,
    ClimateRiskAlert,
    MarketOffer,
    TechnicalAssistanceRequest,
    OfflineLearningMaterial,
)
from flask import request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from flask_restx import Resource

from app.services.technical_assistance_service import (
    SPECIALIST_ROLES,
    TechnicalAssistanceError,
    TechnicalAssistanceService,
)
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id


crop_plots_ns = create_optimized_namespace(
    "crop-plots",
    "Parcelas y cultivos campesinos",
    CropPlot,
)

crop_activities_ns = create_optimized_namespace(
    "crop-activities",
    "Bitacora offline de labores de cultivo",
    CropActivity,
)

water_sources_ns = create_optimized_namespace(
    "water-sources",
    "Fuentes de agua rurales",
    WaterSource,
)

water_measurements_ns = create_optimized_namespace(
    "water-measurements",
    "Mediciones de agua en campo",
    WaterMeasurement,
)

climate_risks_ns = create_optimized_namespace(
    "climate-risks",
    "Alertas locales de clima y riesgo",
    ClimateRiskAlert,
)

market_offers_ns = create_optimized_namespace(
    "market-offers",
    "Mercado campesino local",
    MarketOffer,
)

technical_assistance_ns = create_optimized_namespace(
    "technical-assistance",
    "Solicitudes de asistencia tecnica",
    TechnicalAssistanceRequest,
)


def _assistance_context() -> tuple[int, int, str]:
    """Return the authenticated user, active farm and canonical active role."""
    try:
        user_id = int(get_jwt_identity())
    except (TypeError, ValueError):
        raise TechnicalAssistanceError(
            "No fue posible identificar al usuario autenticado.",
            status_code=401,
            code="INVALID_USER_IDENTITY",
        )

    finca_id = get_current_finca_id()
    if not finca_id:
        raise TechnicalAssistanceError(
            "Selecciona una finca antes de usar la asistencia técnica.",
            status_code=409,
            code="FINCA_CONTEXT_REQUIRED",
        )
    role = str((get_jwt() or {}).get("role") or "").strip()
    return user_id, int(finca_id), role


def _assistance_error(exc: TechnicalAssistanceError):
    return APIResponse.error(
        exc.message,
        status_code=exc.status_code,
        error_code=exc.code,
    )


def _require_veterinarian(role: str) -> None:
    if role not in SPECIALIST_ROLES:
        raise TechnicalAssistanceError(
            "Esta acción está reservada a los veterinarios de la finca.",
            status_code=403,
            code="VETERINARIAN_ROLE_REQUIRED",
        )


@technical_assistance_ns.route("/network")
class TechnicalAssistanceNetworkResource(Resource):
    @technical_assistance_ns.doc(
        "technical_assistance_network",
        description="Veterinarios activos de la finca, con resumen profesional público.",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        try:
            _user_id, finca_id, _role = _assistance_context()
            return APIResponse.success(
                TechnicalAssistanceService.list_veterinarians(finca_id),
                message="Red veterinaria disponible.",
            )
        except TechnicalAssistanceError as exc:
            return _assistance_error(exc)


@technical_assistance_ns.route("/request")
class TechnicalAssistanceCreateResource(Resource):
    @technical_assistance_ns.doc(
        "create_technical_assistance_request",
        description="Crear una solicitud y avisar a los veterinarios activos de la finca.",
        security=["Bearer"],
    )
    @jwt_required()
    def post(self):
        try:
            user_id, finca_id, _role = _assistance_context()
            result = TechnicalAssistanceService.create_request(
                finca_id,
                user_id,
                request.get_json(silent=True) or {},
            )
            return APIResponse.created(result, message="Solicitud enviada a la red veterinaria.")
        except TechnicalAssistanceError as exc:
            return _assistance_error(exc)


@technical_assistance_ns.route("/mine")
class MyTechnicalAssistanceResource(Resource):
    @technical_assistance_ns.doc(
        "list_my_technical_assistance",
        description="Solicitudes visibles para el usuario dentro de la finca activa.",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        try:
            user_id, finca_id, role = _assistance_context()
            limit = request.args.get("limit", default=50, type=int)
            return APIResponse.success(
                TechnicalAssistanceService.list_mine(
                    finca_id,
                    user_id,
                    role,
                    limit=limit,
                )
            )
        except TechnicalAssistanceError as exc:
            return _assistance_error(exc)


@technical_assistance_ns.route("/inbox")
class VeterinarianTechnicalAssistanceInboxResource(Resource):
    @technical_assistance_ns.doc(
        "veterinarian_technical_assistance_inbox",
        description="Bandeja priorizada de solicitudes abiertas para veterinarios.",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        try:
            user_id, finca_id, role = _assistance_context()
            _require_veterinarian(role)
            limit = request.args.get("limit", default=50, type=int)
            return APIResponse.success(
                TechnicalAssistanceService.list_inbox(
                    finca_id,
                    user_id,
                    limit=limit,
                )
            )
        except TechnicalAssistanceError as exc:
            return _assistance_error(exc)


@technical_assistance_ns.route("/<int:request_id>/claim")
class VeterinarianClaimTechnicalAssistanceResource(Resource):
    @technical_assistance_ns.doc(
        "claim_technical_assistance",
        description="Asignar la solicitud al veterinario autenticado.",
        security=["Bearer"],
    )
    @jwt_required()
    def post(self, request_id: int):
        try:
            user_id, finca_id, role = _assistance_context()
            _require_veterinarian(role)
            return APIResponse.success(
                TechnicalAssistanceService.claim(request_id, finca_id, user_id),
                message="Solicitud asignada. El solicitante fue notificado.",
            )
        except TechnicalAssistanceError as exc:
            return _assistance_error(exc)


@technical_assistance_ns.route("/<int:request_id>/respond")
class VeterinarianRespondTechnicalAssistanceResource(Resource):
    @technical_assistance_ns.doc(
        "respond_technical_assistance",
        description="Registrar la respuesta del veterinario y avisar al solicitante.",
        security=["Bearer"],
    )
    @jwt_required()
    def post(self, request_id: int):
        try:
            user_id, finca_id, role = _assistance_context()
            _require_veterinarian(role)
            payload = request.get_json(silent=True) or {}
            return APIResponse.success(
                TechnicalAssistanceService.respond(
                    request_id,
                    finca_id,
                    user_id,
                    payload.get("notes", ""),
                    resolved=bool(payload.get("resolved", True)),
                ),
                message="Respuesta enviada al solicitante.",
            )
        except TechnicalAssistanceError as exc:
            return _assistance_error(exc)


@technical_assistance_ns.route("/<int:request_id>/cancel")
class CancelTechnicalAssistanceResource(Resource):
    @technical_assistance_ns.doc(
        "cancel_technical_assistance",
        description="Cancelar una solicitud propia que todavía está activa.",
        security=["Bearer"],
    )
    @jwt_required()
    def post(self, request_id: int):
        try:
            user_id, finca_id, role = _assistance_context()
            return APIResponse.success(
                TechnicalAssistanceService.cancel(request_id, finca_id, user_id, role),
                message="Solicitud cancelada.",
            )
        except TechnicalAssistanceError as exc:
            return _assistance_error(exc)

offline_learning_ns = create_optimized_namespace(
    "offline-learning",
    "Materiales de aprendizaje offline",
    OfflineLearningMaterial,
)
