import logging
from flask import request
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_restx import Namespace, Resource, fields
from app import db
from app.models.finca import Finca
from app.models.user_finca import UserFinca
from app.models.weather import WeatherRecord, WeatherAlert
from app.services.weather_data_service import WeatherDataService
from app.utils.response_handler import APIResponse

logger = logging.getLogger(__name__)

weather_ns = Namespace("weather", description="Datos climáticos y alertas automáticas")

alert_model = weather_ns.model(
    "WeatherAlert",
    {
        "id": fields.Integer,
        "title": fields.String,
        "alert_type": fields.String,
        "severity": fields.String,
        "description": fields.String,
        "recommendation": fields.String,
        "current_temperature": fields.Float,
        "valid_from": fields.DateTime,
        "valid_until": fields.DateTime,
        "created_at": fields.DateTime,
    },
)

record_model = weather_ns.model(
    "WeatherRecord",
    {
        "id": fields.Integer,
        "recorded_at": fields.DateTime,
        "temperature_celsius": fields.Float,
        "humidity_percent": fields.Float,
        "wind_speed_kmh": fields.Float,
        "precipitation_mm": fields.Float,
        "weather_condition": fields.String,
        "uv_index": fields.Float,
    },
)

weather_summary_model = weather_ns.model(
    "WeatherSummary",
    {
        "current": fields.Nested(record_model, allow_null=True),
        "alerts": fields.List(fields.Nested(alert_model)),
        "history": fields.List(fields.Nested(record_model)),
    },
)


def _current_user_id() -> int | None:
    """El `sub` del JWT es una cadena; las columnas user_id son enteras."""
    identity = get_jwt_identity()
    try:
        return int(identity)
    except (TypeError, ValueError):
        return None


def check_finca_access(finca_id):
    user_id = _current_user_id()
    if not user_id or not UserFinca.has_access(user_id, finca_id):
        return False
    return True


@weather_ns.route("/current/<int:finca_id>")
class WeatherCurrent(Resource):
    @weather_ns.doc(description="Obtiene datos climáticos actuales de una finca")
    @jwt_required()
    def get(self, finca_id):
        try:
            if not check_finca_access(finca_id):
                return APIResponse.forbidden("Sin acceso a esta finca")

            finca = Finca.query.get(finca_id)
            if not finca:
                return APIResponse.not_found("Finca no encontrada")

            result = WeatherDataService.update_finca_weather(finca_id)
            if not result.get("success"):
                error_msg = result.get("error", "Error obteniendo datos")
                if "coordenadas" in error_msg.lower():
                    return APIResponse.success(
                        {
                            "record": None,
                            "alerts_generated": 0,
                            "forecast": {"timezone": None, "daily": [], "hourly": []},
                            "no_coordinates": True,
                        },
                        message="Finca sin coordenadas configuradas",
                    )
                return APIResponse.error(error_msg)

            record_id = result.get("record_id")
            record = WeatherRecord.query.get(record_id) if record_id else None

            return APIResponse.success(
                {
                    "record": WeatherDataService.serialize_record(record)
                    if record
                    else None,
                    "alerts_generated": result.get("alerts_generated", 0),
                    "forecast": result.get(
                        "forecast", {"timezone": None, "daily": [], "hourly": []}
                    ),
                }
            )
        except Exception as e:
            logger.error(f"Error getting current weather: {e}")
            return APIResponse.error(str(e))


@weather_ns.route("/alerts/<int:finca_id>")
class WeatherAlerts(Resource):
    @weather_ns.doc(description="Obtiene alertas climáticas activas de una finca")
    @jwt_required()
    def get(self, finca_id):
        try:
            if not check_finca_access(finca_id):
                return APIResponse.forbidden("Sin acceso a esta finca")

            alerts = WeatherDataService.get_active_alerts(finca_id)
            return APIResponse.success(alerts)
        except Exception as e:
            logger.error(f"Error getting weather alerts: {e}")
            return APIResponse.error(str(e))

    @weather_ns.doc(description="Descarta una alerta climática")
    @weather_ns.expect(
        weather_ns.model(
            "DismissAlert",
            {
                "alert_id": fields.Integer(required=True),
            },
        )
    )
    @jwt_required()
    def post(self, finca_id):
        try:
            if not check_finca_access(finca_id):
                return APIResponse.forbidden("Sin acceso a esta finca")

            data = request.get_json()
            alert_id = data.get("alert_id")
            user_id = _current_user_id()

            if not alert_id:
                return APIResponse.bad_request("alert_id es requerido")

            success = WeatherDataService.dismiss_alert(alert_id, user_id)
            if not success:
                return APIResponse.not_found("Alerta no encontrada")

            return APIResponse.success({"message": "Alerta descartada"})
        except Exception as e:
            logger.error(f"Error dismissing alert: {e}")
            return APIResponse.error(str(e))


@weather_ns.route("/history/<int:finca_id>")
class WeatherHistory(Resource):
    @weather_ns.doc(description="Obtiene histórico de datos climáticos")
    @weather_ns.param("days", "Número de días hacia atrás (default: 7)")
    @jwt_required()
    def get(self, finca_id):
        try:
            if not check_finca_access(finca_id):
                return APIResponse.forbidden("Sin acceso a esta finca")

            days = request.args.get("days", 7, type=int)
            history = WeatherDataService.get_weather_history(finca_id, days)
            return APIResponse.success(history)
        except Exception as e:
            logger.error(f"Error getting weather history: {e}")
            return APIResponse.error(str(e))


@weather_ns.route("/dashboard/<int:finca_id>")
class WeatherDashboard(Resource):
    @weather_ns.doc(description="Obtiene resumen completo del clima para dashboard")
    @jwt_required()
    def get(self, finca_id):
        try:
            if not check_finca_access(finca_id):
                return APIResponse.forbidden("Sin acceso a esta finca")

            days = request.args.get("days", 7, type=int)

            finca = Finca.query.get(finca_id)
            if not finca:
                return APIResponse.not_found("Finca no encontrada")

            history = WeatherDataService.get_weather_history(finca_id, days)
            alerts = WeatherDataService.get_active_alerts(finca_id)

            current = history[-1] if history else None

            return APIResponse.success(
                {
                    "current": current,
                    "alerts": alerts,
                    "history": history,
                    "finca_id": finca_id,
                    # La UI necesita saber si la finca tiene coordenadas para
                    # ofrecer la captura GPS cuando falten.
                    "location": {
                        "latitude": finca.latitude,
                        "longitude": finca.longitude,
                        "department": finca.department,
                        "municipality": finca.municipality,
                    },
                }
            )
        except Exception as e:
            logger.error(f"Error getting weather dashboard: {e}")
            return APIResponse.error(str(e))


@weather_ns.route("/update-all")
class WeatherUpdateAll(Resource):
    @weather_ns.doc(
        description="Actualiza datos climáticos de todas las fincas (admin)"
    )
    @jwt_required()
    def post(self):
        try:
            from app.models.user import Role, User

            user = db.session.get(User, _current_user_id())
            if not user:
                return APIResponse.unauthorized()

            if user.role not in [Role.Administrador, Role.Propietario]:
                return APIResponse.forbidden(
                    "Solo administradores pueden ejecutar esta acción"
                )

            result = WeatherDataService.update_all_fincas()
            return APIResponse.success(result)
        except Exception as e:
            logger.error(f"Error updating all weather: {e}")
            return APIResponse.error(str(e))
