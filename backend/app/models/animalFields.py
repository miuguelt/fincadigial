from app import db
from app.models.base_model import BaseModel
import logging

logger = logging.getLogger(__name__)


class AnimalFields(BaseModel):
    """Modelo para asignaciones de animales a campos/potreros.

    Reglas de negocio:
    - Un animal solo puede tener UNA asignación activa (removal_date IS NULL) a la vez.
    - El histórico de traslados se mantiene con removal_date != NULL.
    """

    __tablename__ = "animal_fields"
    __table_args__ = (
        db.UniqueConstraint(
            "animal_id",
            "field_id",
            "assignment_date",
            name="uq_animal_fields_animal_field_date",
        ),
        db.Index("ix_animal_fields_finca_id", "finca_id"),
        db.Index("ix_animal_fields_field_id", "field_id"),
        db.Index("ix_animal_fields_active", "animal_id", "removal_date"),
        db.Index("ix_animal_fields_field_active", "field_id", "removal_date"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    field_id = db.Column(db.Integer, db.ForeignKey("fields.id"), nullable=False)
    assignment_date = db.Column(db.Date, nullable=False)
    removal_date = db.Column(db.Date, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    # Relaciones
    animal = db.relationship("Animals", back_populates="animal_fields", lazy="selectin")
    field = db.relationship("Fields", back_populates="animal_fields", lazy="selectin")

    # Campos / relaciones para namespaces
    _namespace_fields = [
        "id",
        "animal_id",
        "field_id",
        "assignment_date",
        "removal_date",
        "notes",
        "finca_id",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animal": {"fields": ["id", "record", "sex", "status"], "depth": 1},
        "field": {
            "fields": ["id", "name", "ubication", "capacity", "animal_count"],
            "depth": 1,
        },
    }
    _searchable_fields = ["notes"]
    _filterable_fields = [
        "animal_id",
        "field_id",
        "assignment_date",
        "removal_date",
        "finca_id",
    ]
    _sortable_fields = ["id", "assignment_date", "removal_date"]
    _required_fields = ["animal_id", "field_id", "assignment_date"]

    @property
    def is_active(self) -> bool:
        """Indica si esta asignación está vigente."""
        return self.removal_date is None

    @classmethod
    def get_active_assignment(cls, animal_id: int):
        """Obtiene la asignación activa de un animal (si existe)."""
        return cls.query.filter_by(
            animal_id=animal_id, removal_date=None, is_deleted=False
        ).first()

    @classmethod
    def batch_transfer(
        cls,
        animal_ids: list[int],
        field_id: int,
        assignment_date: str,
        notes: str | None = None,
    ):
        """
        Traslada un grupo de animales a un nuevo potrero.
        Cierra las asignaciones actuales de los animales y crea las nuevas.
        """
        from datetime import date
        from app.models.base_model import ValidationError
        from app.utils.tenant_context import get_current_finca_id

        finca_id = get_current_finca_id()
        if not finca_id:
            raise ValidationError("Contexto de finca no encontrado")

        if isinstance(assignment_date, str):
            try:
                assignment_date_obj = date.fromisoformat(
                    assignment_date.split("T", maxsplit=1)[0]
                )
            except (ValueError, TypeError):
                assignment_date_obj = date.today()
        else:
            assignment_date_obj = assignment_date

        logger.info(
            f"Iniciando batch_transfer para {len(animal_ids)} animales a potrero {field_id} en fecha {assignment_date_obj}"
        )

        from app.models.animals import Animals

        owned_animals = (
            db.session.query(Animals.id)
            .filter(Animals.id.in_(animal_ids), Animals.finca_id == finca_id)
            .all()
        )
        owned_ids = [a.id for a in owned_animals]

        if len(owned_ids) != len(animal_ids):
            raise ValidationError(
                "Uno o más animales no pertenecen a esta finca o no existen"
            )

        active_assignments = cls.query.filter(
            cls.animal_id.in_(owned_ids),
            cls.removal_date.is_(None),
            cls.finca_id == finca_id,
        ).all()

        animals_already_in_field = set()
        origin_field_ids = set()
        for assignment in active_assignments:
            if assignment.field_id == field_id:
                animals_already_in_field.add(assignment.animal_id)
            else:
                assignment.removal_date = assignment_date_obj
                origin_field_ids.add(assignment.field_id)

        animals_to_transfer = [
            a_id for a_id in owned_ids if a_id not in animals_already_in_field
        ]

        # Un animal que ya pasó por este potrero hoy conserva la fila de esa
        # asignación (con removal_date puesto al salir). Reabrirla en vez de
        # saltarla: de lo contrario el animal se quedaba sin potrero activo.
        existing_on_target = AnimalFields.query.filter(
            AnimalFields.animal_id.in_(animals_to_transfer),
            AnimalFields.field_id == field_id,
            AnimalFields.assignment_date == assignment_date_obj,
            AnimalFields.is_deleted == False,
        ).all()

        reactivated_ids = set()
        for assignment in existing_on_target:
            assignment.removal_date = None
            if notes:
                assignment.notes = notes
            db.session.add(assignment)
            reactivated_ids.add(assignment.animal_id)

        new_assignments = []
        for a_id in animals_to_transfer:
            if a_id in reactivated_ids:
                continue

            new_assignments.append(
                {
                    "animal_id": a_id,
                    "field_id": field_id,
                    "assignment_date": assignment_date_obj,
                    "notes": notes or "Traslado masivo de lote",
                    "finca_id": finca_id,
                }
            )

        created = []
        if new_assignments:
            logger.info(
                f"Creadas {len(new_assignments)} nuevas asignaciones para el potrero {field_id}"
            )
            created = cls.bulk_create(new_assignments)
        else:
            logger.info(
                "No se requirieron nuevas asignaciones (ya existían en esta fecha)"
            )

        return {
            "assignments": created,
            "reactivated": [a for a in existing_on_target],
            "skipped_animal_ids": sorted(animals_already_in_field),
            "total_requested": len(animal_ids),
            # Origen y destino: son los potreros cuyo conteo y estado cambian.
            "affected_field_ids": sorted(origin_field_ids | {field_id}),
        }

    @classmethod
    def batch_remove(cls, animal_ids: list[int], removal_date: str):
        """
        Retira masivamente un grupo de animales de sus potreros actuales.
        Cierra las asignaciones activas de estos animales.
        """
        from datetime import date
        from app.models.base_model import ValidationError
        from app.utils.tenant_context import get_current_finca_id

        finca_id = get_current_finca_id()
        if not finca_id:
            raise ValidationError("Contexto de finca no encontrado")

        if isinstance(removal_date, str):
            try:
                removal_date_obj = date.fromisoformat(
                    removal_date.split("T", maxsplit=1)[0]
                )
            except (ValueError, TypeError):
                removal_date_obj = date.today()
        else:
            removal_date_obj = removal_date

        from app.models.animals import Animals

        requested_ids = {int(a_id) for a_id in animal_ids}
        owned_animals = (
            db.session.query(Animals.id)
            .filter(Animals.id.in_(requested_ids), Animals.finca_id == finca_id)
            .all()
        )
        owned_ids = {a.id for a in owned_animals}

        # Antes se ignoraban en silencio los IDs ajenos y el retiro se reportaba
        # como exitoso aunque faltaran animales. Falla igual que el traslado.
        if owned_ids != requested_ids:
            raise ValidationError(
                "Uno o más animales no pertenecen a esta finca o no existen"
            )

        active_assignments = cls.query.filter(
            cls.animal_id.in_(owned_ids),
            cls.removal_date.is_(None),
            cls.finca_id == finca_id,
        ).all()

        affected_field_ids = set()
        for assignment in active_assignments:
            assignment.removal_date = removal_date_obj
            affected_field_ids.add(assignment.field_id)

        removed_ids = {assignment.animal_id for assignment in active_assignments}

        logger.info(
            f"Retirados {len(active_assignments)} animales de sus potreros en fecha {removal_date_obj}"
        )
        return {
            "assignments": active_assignments,
            "skipped_animal_ids": sorted(owned_ids - removed_ids),
            "total_requested": len(requested_ids),
            "affected_field_ids": sorted(affected_field_ids),
        }

    @classmethod
    def create(cls, commit=True, **kwargs):
        """Sobreescribe create para añadir lógica de negocio específica"""
        from app.models.animals import Animals
        from app.models.fields import Fields
        from app.models.base_model import ValidationError

        animal_id = kwargs.get("animal_id")
        field_id = kwargs.get("field_id")

        if animal_id and not Animals.query.get(animal_id):
            raise ValidationError(
                f"Animal con ID {animal_id} no encontrado", code="not_found"
            )
        if field_id and not Fields.query.get(field_id):
            raise ValidationError(
                f"Potrero con ID {field_id} no encontrado", code="not_found"
            )

        if animal_id:
            active_assignment = cls.query.filter(
                cls.animal_id == animal_id,
                cls.removal_date == None,
                cls.is_deleted == False,
            ).first()

            if active_assignment:
                current_field = Fields.query.get(active_assignment.field_id)
                field_name = current_field.name if current_field else "desconocido"

                raise ValidationError(
                    f"El animal ya está en el potrero '{field_name}'",
                    code="conflict",
                    errors={
                        "animal_id": f"Ya está asignado al potrero {field_name}",
                        "current_field_id": active_assignment.field_id,
                        "current_field_name": field_name,
                    },
                )

        return super().create(commit=commit, **kwargs)

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if "assignment_date" in data and not data["assignment_date"]:
            errors.append("La fecha de asignación no puede estar vacía")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError

            raise ValidationError("; ".join(errors), code="validation_error")

    def __repr__(self):
        return (
            f"<AnimalField {self.id}: Animal {self.animal_id} - Field {self.field_id}>"
        )
