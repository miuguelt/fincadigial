from app.models.animal_care_plans import AnimalCarePlan
from app.utils.namespace_helpers import create_optimized_namespace

# Planes de manejo transversal por animal (pegamento entre los seguimientos
# parciales: sanidad, reproducción, nutrición).
animal_care_plans_ns = create_optimized_namespace(
    "animal-care-plans",
    "🧭 Planes de manejo por animal",
    AnimalCarePlan,
)
