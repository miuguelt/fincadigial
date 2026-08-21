"""Rutas analíticas del módulo reproductivo.

Todas delegan el cálculo en ``app.services``: el controlador solo resuelve la
finca del solicitante, acota los parámetros y serializa la respuesta.
"""

import logging

import flask
from flask_jwt_extended import jwt_required
from flask_restx import Resource

from app.services.fertility_analytics_service import FertilityAnalyticsService
from app.services.reproduction import build_herd_kpis
from app.services.reproduction.summary import build_summary
from app.services.sire_performance_service import SirePerformanceService
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id

from ._namespace import reproduction_ns

logger = logging.getLogger(__name__)

MAX_MONTHS = 60


def _months(default: int) -> int:
    requested = flask.request.args.get("months", default=default, type=int) or default
    return min(max(requested, 1), MAX_MONTHS)


def _finca_id() -> int | None:
    return get_current_finca_id()


@reproduction_ns.route("/summary")
class ReproductionSummary(Resource):
    @jwt_required()
    @reproduction_ns.doc("reproduction_summary")
    def get(self):
        """Resumen global del estado reproductivo del ganado."""
        finca_id = _finca_id()
        if finca_id is None:
            return APIResponse.error("Finca no resuelta para el usuario", status_code=400)
        return APIResponse.success(
            data=build_summary(finca_id), message="Resumen reproductivo"
        )


@reproduction_ns.route("/kpis")
class ReproductionKpis(Resource):
    @jwt_required()
    @reproduction_ns.doc(
        "reproduction_kpis",
        params={"months": "Período de análisis en meses (default: 12, máximo: 60)"},
    )
    def get(self):
        """Panel de indicadores reproductivos del hato con metas y semáforo.

        Devuelve inventario reproductivo, eficiencia (intervalo entre partos,
        días abiertos, servicios por concepción, detección de celo y tasa de
        preñez), listas de atención y la proyección de partos y secados.
        """
        finca_id = _finca_id()
        if finca_id is None:
            return APIResponse.error("Finca no resuelta para el usuario", status_code=400)
        return APIResponse.success(
            data=build_herd_kpis(finca_id, _months(12)),
            message="Indicadores reproductivos del hato",
        )


@reproduction_ns.route("/fertility-dashboard")
class FertilityDashboard(Resource):
    @jwt_required()
    @reproduction_ns.doc(
        "fertility_dashboard",
        params={"months": "Período en meses (default: 12)"},
    )
    def get(self):
        """Dashboard de fertilidad con métricas clave."""
        finca_id = _finca_id()
        if finca_id is None:
            return APIResponse.error("Finca no resuelta para el usuario", status_code=400)
        return APIResponse.success(
            data=FertilityAnalyticsService.get_dashboard(finca_id, _months(12)),
            message="Dashboard de fertilidad",
        )


@reproduction_ns.route("/sire-performance")
class SirePerformance(Resource):
    @jwt_required()
    @reproduction_ns.doc(
        "sire_performance",
        params={"months": "Período en meses (default: 12)"},
    )
    def get(self):
        """Análisis de desempeño de los reproductores de la finca."""
        finca_id = _finca_id()
        if finca_id is None:
            return APIResponse.error("Finca no resuelta para el usuario", status_code=400)
        return APIResponse.success(
            data=SirePerformanceService.get_performance(finca_id, _months(12)),
            message="Desempeño de toros",
        )
