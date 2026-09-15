from app import db
import enum
from app.models.base_model import BaseModel


class TaskStatus(enum.Enum):
    PENDING = "Pendiente"
    IN_PROGRESS = "En Progreso"
    COMPLETED = "Completada"
    CANCELLED = "Cancelada"


class TaskPriority(enum.Enum):
    LOW = "Baja"
    MEDIUM = "Media"
    HIGH = "Alta"
    URGENT = "Urgente"


class Tasks(BaseModel):
    """Modelo para la agenda de tareas operativas de la finca."""

    __tablename__ = "tasks"
    __table_args__ = (
        db.Index("ix_tasks_due_date", "due_date"),
        db.Index("ix_tasks_finca_status", "finca_id", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(150), nullable=False)
    description = db.Column(db.Text, nullable=True)
    status = db.Column(db.Enum(TaskStatus), default=TaskStatus.PENDING)
    priority = db.Column(db.Enum(TaskPriority), default=TaskPriority.MEDIUM)
    due_date = db.Column(db.DateTime, nullable=True)

    # Vínculos opcionales
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)
    field_id = db.Column(db.Integer, db.ForeignKey("fields.id"), nullable=True)
    assigned_to = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    # Relaciones
    animal = db.relationship("Animals", backref=db.backref("tasks", lazy="dynamic"))
    field = db.relationship("Fields", backref=db.backref("tasks", lazy="dynamic"))
    assignee = db.relationship(
        "User",
        foreign_keys=[assigned_to],
        backref=db.backref("assigned_tasks", lazy="dynamic"),
    )
    completion_record = db.relationship(
        "TaskCompletionRecord",
        back_populates="task",
        uselist=False,
        lazy="selectin",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    _namespace_fields = [
        "id",
        "title",
        "description",
        "status",
        "priority",
        "due_date",
        "animal_id",
        "field_id",
        "assigned_to",
        "finca_id",
        "completion_record_id",
        "created_at",
    ]
    _enum_fields = {"status": TaskStatus, "priority": TaskPriority}

    @classmethod
    def _validate_namespace_data(cls, data):
        """Validación de seguridad para asegurar consistencia multi-tenant"""
        from app.models.user import User

        errors = []

        if "assigned_to" in data and data["assigned_to"]:
            user = User.query.get(data["assigned_to"])
            finca_id = data.get("finca_id")
            if user and user.finca_id != finca_id:
                errors.append(
                    "No se puede asignar una tarea a un usuario de otra finca."
                )

        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError

            raise ValidationError("; ".join(errors), code="security_violation")

    @property
    def completion_record_id(self):
        """ID del registro vigente; no expone evidencia mientras la tarea esté abierta."""
        if self.status != TaskStatus.COMPLETED:
            return None
        record = self.completion_record
        if record is None or getattr(record, "is_deleted", False):
            return None
        return record.id

    @classmethod
    def create(cls, commit=True, **kwargs):
        """Cubre también las tareas que nacen ya marcadas como completadas."""
        completion_notes = kwargs.pop("completion_notes", None)
        instance = super().create(commit=False, **kwargs)
        completion = None

        if instance.status == TaskStatus.COMPLETED:
            from app.services.task_completion_service import ensure_task_completion

            completion = ensure_task_completion(instance, notes=completion_notes)

        if commit:
            db.session.commit()
            db.session.refresh(instance)
            if completion is not None:
                db.session.refresh(completion)
                from app.services.task_completion_service import log_task_completion

                log_task_completion(instance, completion)

        return instance

    def update(self, commit=True, **kwargs):
        """Actualiza la tarea y crea su evidencia en la misma transacción."""
        completion_notes = kwargs.pop("completion_notes", None)
        previous_status = self.status
        updated = super().update(commit=False, **kwargs)

        completion = None
        if (
            previous_status == TaskStatus.CANCELLED
            and self.status == TaskStatus.COMPLETED
        ):
            from app.services.task_completion_service import TaskCompletionNotAllowed

            raise TaskCompletionNotAllowed(
                "Una tarea cancelada no puede marcarse como completada."
            )
        if self.status == TaskStatus.COMPLETED:
            from app.services.task_completion_service import ensure_task_completion

            completion = ensure_task_completion(
                self,
                notes=completion_notes,
            )

        if commit:
            self.save(commit=False)
            db.session.commit()
            db.session.refresh(self)
            if completion is not None:
                db.session.refresh(completion)

                if previous_status != TaskStatus.COMPLETED:
                    from app.services.task_completion_service import (
                        log_task_completion,
                    )

                    log_task_completion(self, completion)

        return updated
