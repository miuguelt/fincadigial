from datetime import date
from app import db
from app.models.fields import Fields, LandStatus
from app.models.animalFields import AnimalFields

class GrazingService:
    @staticmethod
    def rotate_group(field_id: int, target_field_id: int):
        """Mueve a todos los animales de un potrero a otro y marca el descanso."""
        source_field = Fields.query.get_or_404(field_id)
        target_field = Fields.query.get_or_404(target_field_id)

        # 1. Obtener animales activos en el potrero origen
        active_assignments = AnimalFields.query.filter_by(
            field_id=field_id, removal_date=None
        ).all()

        # 2. Cerrar asignaciones viejas y crear nuevas
        today = date.today()
        for assignment in active_assignments:
            assignment.removal_date = today
            AnimalFields.create(
                animal_id=assignment.animal_id,
                field_id=target_field_id,
                entry_date=today
            )

        # 3. Actualizar estados de los potreros
        source_field.state = LandStatus.Mantenimiento
        source_field.last_grazing_date = today

        target_field.state = LandStatus.Ocupado

        db.session.commit()
        return {
            "message": f"Rotación completada: {len(active_assignments)} animales movidos.",
            "source_status": "En descanso",
            "target_status": "Ocupado"
        }

    @staticmethod
    def get_grazing_plan(finca_id: int):
        """Genera un plan de rotación basado en el descanso de los potreros."""
        fields = Fields.query.filter_by(finca_id=finca_id).all()

        plan = {
            "ready_for_grazing": [],
            "currently_resting": [],
            "occupied": []
        }

        for f in fields:
            f_data = f.to_namespace_dict()
            if f.state == LandStatus.Ocupado:
                plan["occupied"].append(f_data)
            elif f.is_grazing_ready:
                plan["ready_for_grazing"].append(f_data)
            else:
                plan["currently_resting"].append(f_data)

        return plan
