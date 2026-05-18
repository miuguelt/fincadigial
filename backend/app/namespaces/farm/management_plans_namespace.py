from app.models.management_plans import ManagementPlan
from app.utils.namespace_helpers import create_optimized_namespace

management_plans_ns = create_optimized_namespace(
    "management-plans",
    "Planes de manejo pedagógico y ganadero",
    ManagementPlan,
)
