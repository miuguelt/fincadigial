"""HTTP endpoint for the custom analytical report.

The report itself is built in `app.services.analytics.custom_report`; here only
lives what belongs to the transport layer: reading the body, resolving the
active farm and turning failures into a response the operator can act on.
"""

import logging

from flask import request
from flask_jwt_extended import get_jwt_identity, jwt_required
from flask_restx import Resource

from app.services.analytics.custom_report import build_custom_report
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id

from . import analytics_ns

logger = logging.getLogger(__name__)


def _requesting_user() -> str:
    identity = get_jwt_identity()
    if isinstance(identity, dict):
        return identity.get("fullname", "Usuario")
    return str(identity)


@analytics_ns.route("/reports/custom")
class CustomReports(Resource):
    @jwt_required()
    def post(self):
        """Genera un reporte personalizado con los registros de la finca activa."""
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error("No hay finca seleccionada", status_code=400)

        try:
            report = build_custom_report(request.get_json(silent=True) or {}, finca_id)
        except ValueError as error:
            return APIResponse.error(str(error), status_code=400)
        except Exception:
            # El detalle del modelo o de la base no sale al navegador: el
            # traceback queda en el log y el operador recibe qué hacer.
            logger.exception("Error generando reporte personalizado")
            return APIResponse.error(
                "No fue posible generar el reporte con los datos actuales"
            )

        return APIResponse.success(
            {
                "report": report,
                "metadata": {
                    "generated_at": report["generated_at"],
                    "user": _requesting_user(),
                    "finca_id": finca_id,
                },
            }
        )
