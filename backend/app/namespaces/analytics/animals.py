from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required
import flask
from app.services.analytics.medical_service import MedicalAnalyticsService
from app.services.analytics.production_service import ProductionAnalyticsService
from app.utils.response_handler import APIResponse
from app.utils.rbac import require_permission

animals_ns = Namespace("analytics/animals", description="🐄 Animal Analytics")


@animals_ns.route("/<int:animal_id>/medical-history")
class AnimalMedicalHistory(Resource):
    @jwt_required()
    @require_permission("animal-analytics", "read")
    def get(self, animal_id):
        """Historial médico + reproductivo + alertas + cumplimiento ICA de un animal"""
        limit = int(flask.request.args.get("limit", 50))
        start_date = flask.request.args.get("start_date")
        end_date = flask.request.args.get("end_date")
        history = MedicalAnalyticsService.get_animal_medical_history(
            animal_id, limit, start_date, end_date
        )
        if not history:
            return APIResponse.error("Animal no encontrado", status_code=404)
        return APIResponse.success(history)


@animals_ns.route("/<int:animal_id>/ica-compliance")
class AnimalICACompliance(Resource):
    @jwt_required()
    @require_permission("animal-analytics", "read")
    def get(self, animal_id):
        """Semáforo de cumplimiento ICA para un animal (verde/amarillo/rojo)"""
        from datetime import date

        result = MedicalAnalyticsService._check_ica_compliance(animal_id, date.today())
        return APIResponse.success(result)


@animals_ns.route("/ica-compliance-report")
class HerdICACompliance(Resource):
    @jwt_required()
    @require_permission("animal-analytics", "read")
    def get(self):
        """Reporte de cumplimiento ICA para todo el ganado."""
        from app.utils.tenant_context import get_current_finca_id

        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error("Contexto de finca no encontrado", status_code=400)

        result = MedicalAnalyticsService.get_herd_ica_compliance(finca_id)
        return APIResponse.success(result)


@animals_ns.route("/upcoming-events")
class UpcomingEvents(Resource):
    @jwt_required()
    @require_permission("animal-analytics", "read")
    def get(self):
        """
        Eventos ganaderos en los próximos N días:
        partos, post-partos, vacunaciones por vencer y controles pendientes.
        """
        days_ahead = int(flask.request.args.get("days", 30))
        result = MedicalAnalyticsService.get_upcoming_events(days_ahead)
        return APIResponse.success(result)


@animals_ns.route("/distribution")
class AnimalDistribution(Resource):
    @jwt_required()
    @require_permission("animal-analytics", "read")
    def get(self):
        """Distribución de animales por raza/sexo"""
        group_by = flask.request.args.get("group_by", "breed")
        dist = ProductionAnalyticsService.get_animal_distribution(group_by)
        return APIResponse.success(dist)
