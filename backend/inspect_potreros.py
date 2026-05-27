import os
import sys
from dotenv import load_dotenv

sys.path.append(os.getcwd())
load_dotenv()

try:
    from app import create_app
    from app.models.fields import Fields
    from app.models.animalFields import AnimalFields
    from app.models.animals import Animals, AnimalStatus

    app = create_app()
    with app.app_context():
        # Get all fields
        fields = Fields.query.all()
        print(f"Total fields (potreros) in database: {len(fields)}")
        print("-" * 80)
        print(f"{'ID':<5} | {'Nombre':<20} | {'Ubicación':<20} | {'Capacidad':<10} | {'Estado':<12} | {'Animales':<8}")
        print("-" * 80)
        
        for f in fields:
            # Count active animals in this field
            active_animals = AnimalFields.query.join(Animals).filter(
                AnimalFields.field_id == f.id,
                AnimalFields.removal_date == None,
                AnimalFields.is_deleted == False,
                Animals.is_deleted == False,
                Animals.status == AnimalStatus.Vivo
            ).count()
            
            print(f"{f.id:<5} | {f.name or 'N/A':<20} | {f.ubication or 'N/A':<20} | {f.capacity or 'N/A':<10} | {f.state.value if hasattr(f.state, 'value') else str(f.state):<12} | {active_animals:<8}")
            
        print("-" * 80)
        
        # Check for orphan assignments (assignments to non-existent fields or animals)
        orphans_field = AnimalFields.query.filter(~AnimalFields.field_id.in_([f.id for f in fields])).count()
        print(f"Assignments with non-existent field_id: {orphans_field}")
        
        # Check active assignments overall
        active_assignments = AnimalFields.query.filter_by(removal_date=None, is_deleted=False).count()
        print(f"Total active animal-field assignments: {active_assignments}")
        
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
