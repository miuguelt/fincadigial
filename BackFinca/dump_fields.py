from app import create_app
from app.models.fields import Fields
import json

app = create_app()
with app.app_context():
    fields = Fields.query.limit(5).all()
    results = []
    for f in fields:
        results.append({
            "id": f.id,
            "name": f.name,
            "ubication": f.ubication,
            "capacity": f.capacity,
            "area": f.area,
            "handlings": f.handlings,
            "state": str(f.state)
        })
    print(json.dumps(results, indent=2))
