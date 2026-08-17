# app/namespaces/species_namespace.py

from app.models.species import Species
from app.utils.namespace_helpers import create_optimized_namespace

# Crear el namespace optimizado usando el factory
species_ns = create_optimized_namespace(
    name="species",
    description="🧬 Gestión Optimizada de Especies - Catálogo Genético",
    model_class=Species,
    path="/species",
)
