from app import models
from app.utils.namespace_helpers import create_optimized_namespace

model_for_update = models.AnimalDisease.__table__.columns.keys()

animal_diseases_ns = create_optimized_namespace('animal-diseases', description='Gestión de enfermedades de animales', model_class=models.AnimalDisease)

# Note: Standard CRUD operations (GET list, GET by ID, POST, PUT, PATCH, DELETE)
# are automatically handled by create_optimized_namespace above.
# This file is intentionally minimal as all logic is in the optimized helper.

