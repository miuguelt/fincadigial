import flask
from flask_restx import Resource, fields
from flask_jwt_extended import jwt_required
from app.models.milk_production import MilkProduction, MilkSession
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse, ResponseFormatter
from app.utils.tenant_context import get_current_finca_id
from app.services.milk_production_service import MilkProductionService
from app import db
import logging
from datetime import datetime, date

logger = logging.getLogger(__name__)

milk_ns = create_optimized_namespace(
    name="milk-production",
    description="Operaciones relacionadas con el registro de producción láctea",
    model_class=MilkProduction,
    path="/milk-production",
)

batch_entry_model = milk_ns.model(
    "MilkBatchEntry",
    {
        "animal_id": fields.Integer(required=True, description="ID del animal"),
        "liters": fields.Float(required=True, description="Litros producidos"),
        "milking_session": fields.String(
            required=True, enum=["AM", "PM", "Extra"], description="Sesión de ordeño"
        ),
        "fat_percentage": fields.Float(description="Porcentaje de grasa (opcional)"),
        "protein_percentage": fields.Float(
            description="Porcentaje de proteína (opcional)"
        ),
        "somatic_cells": fields.Integer(description="Células somáticas (opcional)"),
        "notes": fields.String(description="Notas adicionales"),
    },
)

batch_input_model = milk_ns.model(
    "MilkBatchInput",
    {
        "date": fields.String(required=True, description="Fecha (YYYY-MM-DD)"),
        "entries": fields.List(
            fields.Nested(batch_entry_model),
            required=True,
            description="Lista de registros de leche",
        ),
    },
)


@milk_ns.route("/animal/<int:animal_id>")
class MilkProductionByAnimal(Resource):
    @milk_ns.doc(
        "get_milk_by_animal",
        description="Obtener producción láctea por animal (paginado)",
    )
    @jwt_required()
    def get(self, animal_id):
        page = flask.request.args.get("page", default=1, type=int) or 1
        limit = (
            flask.request.args.get("limit", type=int)
            or flask.request.args.get("per_page", type=int)
            or 50
        )

        query = MilkProduction.query.filter_by(animal_id=animal_id).order_by(
            MilkProduction.date.desc()
        )

        pagination = query.paginate(page=page, per_page=int(limit), error_out=False)
        items = [
            (m.to_namespace_dict() if hasattr(m, "to_namespace_dict") else m.to_json())
            for m in pagination.items
        ]

        sanitized = ResponseFormatter.sanitize_for_frontend(items)
        return APIResponse.paginated_success(
            data=sanitized,
            page=page,
            limit=int(limit),
            total_items=pagination.total,
            message="Producción láctea por animal obtenida",
        )


@milk_ns.route("/animal/<int:animal_id>/trend")
class MilkProductionAnimalTrend(Resource):
    @milk_ns.doc(
        "get_animal_trend", description="Obtener tendencia de producción para un animal"
    )
    @jwt_required()
    def get(self, animal_id):
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error("Finca no seleccionada", code=400)

        days = flask.request.args.get("days", default=30, type=int)

        try:
            trend = MilkProductionService.get_animal_trend(animal_id, finca_id, days)
            return APIResponse.success(
                data=trend, message="Tendencia de producción obtenida"
            )
        except Exception as e:
            logger.error(f"Error obteniendo tendencia: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500)


@milk_ns.route("/summary/daily")
class MilkProductionDailySummary(Resource):
    @milk_ns.doc(
        "get_milk_daily_summary", description="Resumen diario de producción por finca"
    )
    @jwt_required()
    def get(self):
        finca_id = (
            flask.request.args.get("finca_id", type=int) or get_current_finca_id()
        )
        if not finca_id:
            return APIResponse.error("finca_id es requerido", code=400)

        date_str = flask.request.args.get("date")
        target_date = None
        if date_str:
            try:
                target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return APIResponse.error(
                    "Formato de fecha inválido. Use YYYY-MM-DD", code=400
                )

        try:
            summary = MilkProductionService.get_daily_summary(finca_id, target_date)
            return APIResponse.success(data=summary)
        except Exception as e:
            logger.error(f"Error en resumen diario: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500)


@milk_ns.route("/summary/weekly")
class MilkProductionWeeklySummary(Resource):
    @milk_ns.doc(
        "get_milk_weekly_summary", description="Resumen semanal con tendencias"
    )
    @jwt_required()
    def get(self):
        finca_id = (
            flask.request.args.get("finca_id", type=int) or get_current_finca_id()
        )
        if not finca_id:
            return APIResponse.error("finca_id es requerido", code=400)

        date_str = flask.request.args.get("start_date")
        start_date = None
        if date_str:
            try:
                start_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            except ValueError:
                return APIResponse.error(
                    "Formato de fecha inválido. Use YYYY-MM-DD", code=400
                )

        try:
            summary = MilkProductionService.get_weekly_summary(finca_id, start_date)
            return APIResponse.success(data=summary)
        except Exception as e:
            logger.error(f"Error en resumen semanal: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500)


@milk_ns.route("/summary/monthly")
class MilkProductionMonthlySummary(Resource):
    @milk_ns.doc(
        "get_milk_monthly_summary", description="Resumen mensual con tendencias"
    )
    @jwt_required()
    def get(self):
        finca_id = (
            flask.request.args.get("finca_id", type=int) or get_current_finca_id()
        )
        if not finca_id:
            return APIResponse.error("finca_id es requerido", code=400)

        year = flask.request.args.get("year", type=int)
        month = flask.request.args.get("month", type=int)

        try:
            summary = MilkProductionService.get_monthly_summary(finca_id, year, month)
            return APIResponse.success(data=summary)
        except Exception as e:
            logger.error(f"Error en resumen mensual: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500)


@milk_ns.route("/batch")
class MilkBatchEntry(Resource):
    @milk_ns.doc(
        "create_milk_batch",
        description="Registrar producción láctea de múltiples animales en una sesión",
    )
    @jwt_required()
    @milk_ns.expect(batch_input_model)
    def post(self):
        try:
            data = flask.request.get_json()
            if not data or "entries" not in data:
                return APIResponse.error(
                    "Se requiere lista de entradas (entries)", code=400
                )

            date_str = data.get("date", datetime.now().strftime("%Y-%m-%d"))
            finca_id = get_current_finca_id()
            if not finca_id:
                return APIResponse.error("Finca no seleccionada", code=400)

            entries = data.get("entries", [])
            if not entries:
                return APIResponse.error("Lista de entradas vacía", code=400)

            result = MilkProductionService.create_batch(date_str, finca_id, entries)

            if "error" in result:
                return APIResponse.error(result["error"], code=400)

            status_code = 207 if result["errors"] else 201
            return APIResponse.success(
                data=result,
                message=f"Sesión de ordeño registrada: {result['created']} animales, {result['errors']} errores",
                status_code=status_code,
            )

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error en entrada por lotes de leche: {str(e)}")
            return APIResponse.error(
                "Error interno del servidor", status_code=500, details={"error": str(e)}
            )


@milk_ns.route("/revenue/estimate")
class MilkRevenueEstimate(Resource):
    @milk_ns.doc(
        "estimate_milk_revenue", description="Estimar ingresos por producción de leche"
    )
    @jwt_required()
    def get(self):
        finca_id = (
            flask.request.args.get("finca_id", type=int) or get_current_finca_id()
        )
        if not finca_id:
            return APIResponse.error("finca_id es requerido", code=400)

        price_per_liter = (
            flask.request.args.get("price_per_liter", type=float) or 1200.0
        )
        year = flask.request.args.get("year", type=int)
        month = flask.request.args.get("month", type=int)

        try:
            estimate = MilkProductionService.estimate_revenue(
                finca_id, price_per_liter, year, month
            )
            return APIResponse.success(data=estimate)
        except Exception as e:
            logger.error(f"Error en estimación de ingresos: {str(e)}")
            return APIResponse.error("Error interno del servidor", status_code=500)
