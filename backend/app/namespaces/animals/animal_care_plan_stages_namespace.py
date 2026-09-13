from app.models.animal_care_plans import AnimalCarePlanStage
from app.utils.namespace_helpers import create_optimized_namespace

# Etapas de un plan de manejo por animal (hitos programados con su acto).
animal_care_plan_stages_ns = create_optimized_namespace(
    "animal-care-plan-stages",
    "🧩 Etapas de planes de manejo por animal",
    AnimalCarePlanStage,
)
