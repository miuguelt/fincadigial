import sys
import os
import json

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models.species import Species
from app.models.user import User
from flask_jwt_extended import create_access_token

app = create_app()
with app.app_context():
    # Encontrar un usuario para autenticar
    user = User.query.first()
    if not user:
        print("No hay usuarios en la base de datos.")
        sys.exit(1)
        
    # Encontrar una especie que tenga dependencias (por ejemplo, con ID 1 o la primera que encontremos con breeds)
    from app.models.breeds import Breeds
    breed = Breeds.query.first()
    if breed:
        species_id = breed.species_id
        species = Species.get_by_id(species_id)
        print(f"Probando especie ID {species_id} ({species.name if species else 'Desconocida'}):")
        
        # Generar token
        # El backend puede esperar la identidad en un formato específico, e.g., el ID del usuario, o un string
        token = create_access_token(identity=str(user.id))
        
        client = app.test_client()
        headers = {
            'Authorization': f'Bearer {token}'
        }
        response = client.get(f'/api/v1/species/{species_id}/dependencies', headers=headers)
        print(f"Status Code: {response.status_code}")
        print("Response JSON:")
        print(json.dumps(response.json, indent=2, ensure_ascii=False))
    else:
        print("No hay razas en la base de datos para probar.")
