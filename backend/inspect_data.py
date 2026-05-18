from app import create_app
from app.models.breeds import Breeds
from app.models.animals import Animals
import json

app = create_app()
with app.app_context():
    breed_count = Breeds.query.count()
    animal_count = Animals.query.count()
    
    breeds = Breeds.query.limit(3).all()
    animals = Animals.query.limit(3).all()
    
    print(json.dumps({
        "counts": {
            "breeds": breed_count,
            "animals": animal_count
        },
        "breeds_sample": [b.to_json() for b in breeds],
        "animals_sample": [a.to_json() for a in animals]
    }, indent=2))
