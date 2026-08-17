# app/namespaces/farm/animal_groups_namespace.py

from app.models.operational import AnimalGroup
from app.utils.namespace_helpers import create_optimized_namespace

# Create the optimized namespace for the AnimalGroup model
animal_groups_ns = create_optimized_namespace(
    name="animal-groups",
    description="🐄 Gestión de Grupos de Animales",
    model_class=AnimalGroup,
    path="/animal-groups",
)
