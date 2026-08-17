# app/namespaces/farm/infrastructure_namespace.py

from app.models.operational import Infrastructure
from app.utils.namespace_helpers import create_optimized_namespace

# Create the optimized namespace for the Infrastructure model
infrastructure_ns = create_optimized_namespace(
    name="infrastructure",
    description="🏗️ Gestión de Infraestructura de la Finca",
    model_class=Infrastructure,
    path="/infrastructure",
)
