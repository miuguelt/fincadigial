from flask_restx import Namespace, Resource
import flask
from flask_jwt_extended import jwt_required
from datetime import datetime, UTC
import logging

from app.models.system_content import SystemContent
from app.utils.response_handler import APIResponse

logger = logging.getLogger(__name__)

ai_ns = Namespace(
    "ai-insights",
    description="🤖 Analytics - Insights del sistema (desde BD)",
    path="/analytics/ai-insights",
)


@ai_ns.route("")
class AIInsights(Resource):
    @ai_ns.doc(
        "get_ai_insights",
        params={
            "action": {
                "description": "Tipo de análisis",
                "type": "string",
                "enum": ["general_status", "health_warning", "productivity_opt"],
                "default": "general_status",
            },
            "finca_id": {
                "description": "ID finca para contenido específico",
                "type": "integer",
            },
        },
        security=["Bearer", "Cookie"],
        responses={
            200: "Insight generado",
            401: "No autorizado",
            500: "Error del servidor",
        },
    )
    @jwt_required()
    def get(self):
        """Obtiene insights predefinidos del sistema desde la BD."""
        try:
            action_type = flask.request.args.get("action", "general_status")
            finca_id = flask.request.args.get("finca_id", type=int)

            key = f"insight.{action_type}"
            entry = SystemContent.get_by_key(key, finca_id=finca_id)

            if not entry:
                entry = SystemContent.get_by_key(f"insight.{action_type}")

            if entry:
                return APIResponse.success(
                    {
                        "insight": entry.content,
                        "model": "db",
                        "generated_at": datetime.now(UTC).isoformat(),
                        "title": entry.title,
                    }
                )

            return APIResponse.success(
                {
                    "insight": "No hay contenido disponible para este análisis.",
                    "model": "db",
                    "generated_at": datetime.now(UTC).isoformat(),
                }
            )
        except Exception as e:
            logger.error("Error obteniendo insights: %s", e, exc_info=True)
            return APIResponse.error(
                "Error al obtener insights del sistema", status_code=500
            )
