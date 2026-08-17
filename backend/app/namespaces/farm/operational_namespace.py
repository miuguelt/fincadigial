from flask_restx import Resource
from app.models.operational_costs import OperationalCost
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse
from app import db
from sqlalchemy import func

# Crear el namespace optimizado
operational_ns = create_optimized_namespace(
    "operational", "💸 Registro de Gastos Operativos", OperationalCost
)


@operational_ns.route("/summary")
class OperationalSummary(Resource):
    @operational_ns.doc(
        "get_operational_summary", description="Resumen de gastos por categoría"
    )
    def get(self):
        from app.utils.tenant_context import get_current_finca_id

        finca_id = get_current_finca_id()

        # Agrupar por categoría
        results = (
            db.session.query(OperationalCost.category, func.sum(OperationalCost.amount))
            .filter_by(finca_id=finca_id)
            .group_by(OperationalCost.category)
            .all()
        )

        summary = {str(cat.value): float(total) for cat, total in results}

        return APIResponse.success(
            {"by_category": summary, "total": sum(summary.values())}
        )
