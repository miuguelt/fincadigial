from datetime import date, timedelta
from app.models.operational import AnimalGroup, PastureAforo, Infrastructure


class OperationalService:
    """Servicio encargado de los cálculos complejos de la operación de campo."""

    @staticmethod
    def calculate_field_status(field_id):
        """Retorna datos objetivos del potrero basados en aforos. Sin colores ni mensajes fabricados."""
        last_aforo = (
            PastureAforo.query.filter_by(field_id=field_id)
            .order_by(PastureAforo.created_at.desc())
            .first()
        )

        if not last_aforo:
            return None

        return {
            "entry_height": last_aforo.entry_height,
            "exit_height": last_aforo.exit_height,
            "entry_date": last_aforo.created_at.isoformat()
            if last_aforo.created_at
            else None,
        }

    @staticmethod
    def apply_group_treatment(group_id, treatment_data):
        """Aplica un tratamiento sanitario a todo un grupo de animales."""
        group = AnimalGroup.query.get(group_id)
        if not group:
            return 0

        from app.models.treatments import Treatments
        from app.models.treatment_medications import TreatmentMedications

        count = 0
        for animal in group.animals:
            # Crear el tratamiento individual
            t = Treatments.create(
                treatment_date=treatment_data.get("date", date.today()),
                description=treatment_data.get("description"),
                frequency=treatment_data.get("frequency", "Única"),
                dosis=treatment_data.get("dosis"),
                animal_id=animal.id,
                finca_id=group.finca_id,
            )

            # Si hay medicamento vinculado, crear la relación (esto activará el descuento de stock)
            if treatment_data.get("medication_id"):
                TreatmentMedications.create(
                    treatment_id=t.id,
                    medication_id=treatment_data["medication_id"],
                    lot_id=treatment_data.get("lot_id"),
                    quantity=treatment_data.get("quantity_per_animal", 0),
                )
            count += 1

        return count

    @staticmethod
    def get_maintenance_alerts(finca_id):
        """Obtiene infraestructura que requiere mantenimiento urgente."""
        today = date.today()
        # Buscar activos con mantenimiento vencido o próximo (7 días)
        urgent = Infrastructure.query.filter(
            Infrastructure.finca_id == finca_id,
            Infrastructure.next_maintenance != None,
            Infrastructure.next_maintenance <= (today + timedelta(days=7)),
        ).all()

        return [
            {
                "name": i.name,
                "type": i.type.value if hasattr(i.type, "value") else str(i.type),
                "days_left": (i.next_maintenance - today).days
                if i.next_maintenance
                else 0,
                "urgency": "Alta"
                if i.next_maintenance and i.next_maintenance <= today
                else "Media",
            }
            for i in urgent
        ]
