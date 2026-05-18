from app import create_app
from app.extensions import db
from app.models import FoodTypes, Medications, RouteAdministration, Finca
from datetime import date

app = create_app()
with app.app_context():
    print("--- Sembrando Catálogos Faltantes ---")
    
    finca = Finca.query.first()
    finca_id = finca.id if finca else 1

    # 1. Rutas de Administración
    routes = ["Intramuscular", "Subcutánea", "Oral", "Tópica", "Intravenosa"]
    route_ids = {}
    for r_name in routes:
        r = RouteAdministration.query.filter_by(name=r_name).first()
        if not r:
            r = RouteAdministration(name=r_name)
            db.session.add(r)
            db.session.flush()
        route_ids[r_name] = r.id
    print(f"Rutas de administración listas: {len(route_ids)}")

    # 2. Medicamentos
    meds = [
        {"name": "Ivermectina 1%", "description": "Antiparasitario de amplio espectro", "route": "Subcutánea"},
        {"name": "Oxitetraciclina", "description": "Antibiótico de amplio espectro", "route": "Intramuscular"},
        {"name": "Complejo B", "description": "Suplemento vitamínico", "route": "Intramuscular"},
        {"name": "Dexametasona", "description": "Antiinflamatorio", "route": "Intravenosa"}
    ]
    for m in meds:
        if not Medications.query.filter_by(name=m["name"]).first():
            new_med = Medications(
                name=m["name"],
                description=m["description"],
                route_administration_id=route_ids[m["route"]],
                availability=True
            )
            db.session.add(new_med)
            print(f"Medicamento añadido: {m['name']}")

    # 3. Tipos de Alimento (Cultivos)
    foods = [
        {"food_type": "Pasto Estrella", "area": 15, "handlings": "Pastoreo rotacional", "gauges": "10cm"},
        {"food_type": "Pasto Brachiaria", "area": 25, "handlings": "Abono orgánico", "gauges": "15cm"},
        {"food_type": "Maíz Forrajero", "area": 5, "handlings": "Riego por goteo", "gauges": "N/A"}
    ]
    for f in foods:
        if not FoodTypes.query.filter_by(food_type=f["food_type"], finca_id=finca_id).first():
            new_food = FoodTypes(
                food_type=f["food_type"],
                area=f["area"],
                handlings=f["handlings"],
                gauges=f["gauges"],
                sowing_date=date(2026, 1, 1),
                finca_id=finca_id
            )
            db.session.add(new_food)
            print(f"Alimento añadido: {f['food_type']}")

    db.session.commit()
    print("--- Sembrado completado con éxito ---")
