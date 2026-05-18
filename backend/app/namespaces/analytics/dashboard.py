from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required
from app.services.analytics.dashboard_service import DashboardService
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from app.utils.cache_utils import safe_cached

dashboard_ns = Namespace('analytics/dashboard', description='📊 Dashboard Analytics')


@dashboard_ns.route('')
class DashboardSummary(Resource):
    @dashboard_ns.doc(security=['Bearer', 'Cookie'])
    @jwt_required()
    @safe_cached(timeout=60, key_prefix='dashboard_basic')
    def get(self):
        """Resumen básico del dashboard"""
        finca_id = get_current_finca_id()
        stats = DashboardService.get_basic_stats(finca_id)
        return APIResponse.success(stats)


@dashboard_ns.route('/complete')
class CompleteStats(Resource):
    @dashboard_ns.doc(security=['Bearer', 'Cookie'])
    @jwt_required()
    @safe_cached(timeout=120, key_prefix='dashboard_complete')
    def get(self):
        """Estadísticas completas del dashboard"""
        finca_id = get_current_finca_id()
        stats = DashboardService.get_complete_stats(finca_id)
        return APIResponse.success(stats)
