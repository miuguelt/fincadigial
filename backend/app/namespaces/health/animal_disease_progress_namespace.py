from app.models.animalDiseaseProgress import AnimalDiseaseProgress
from app.utils.namespace_helpers import create_optimized_namespace

animal_disease_progress_ns = create_optimized_namespace(
    "animal-disease-progress",
    description="Avances (seguimiento) de episodios de enfermedad",
    model_class=AnimalDiseaseProgress,
    rbac_entity="animal-diseases",
)
