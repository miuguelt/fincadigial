from app import create_app
from app.extensions import db
from app.models import Animals, Finca

app = create_app()
with app.app_context():
    finca_id = 4
    count = Animals.query.filter_by(finca_id=finca_id).count()
    print(f"Animales actuales en Finca 4: {count}")
    
    if count < 10:
        print("Asociando animales aleatorios a la Finca 4 para visualización...")
        # Tomar algunos animales de otras fincas para poblar esta
        others = Animals.query.filter(Animals.finca_id != finca_id).limit(20).all()
        for a in others:
            a.finca_id = finca_id
        db.session.commit()
        print(f"Ahora hay {Animals.query.filter_by(finca_id=finca_id).count()} animales en Finca 4.")
