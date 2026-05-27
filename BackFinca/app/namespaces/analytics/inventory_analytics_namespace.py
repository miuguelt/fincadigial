from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required
from app.services.analytics.inventory_analytics_service import InventoryAnalyticsService
from app.utils.tenant_context import get_current_finca_id
from app.utils.response_handler import APIResponse

inventory_analytics_ns = Namespace('analytics/inventory', description='📊 Analítica de Inventario')

@inventory_analytics_ns.route('/autonomy')
class InventoryAutonomy(Resource):
    @jwt_required()
    def get(self):
        """Obtiene la autonomía de inventario (días restantes)"""
        finca_id = get_current_finca_id()
        if not finca_id:
            return APIResponse.error("Finca no identificada")

        results = InventoryAnalyticsService.get_inventory_autonomy(finca_id)
        return APIResponse.success(results)
