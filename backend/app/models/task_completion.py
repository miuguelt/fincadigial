from app import db
from app.models.base_model import BaseModel


class TaskCompletionRecord(BaseModel):
    """Evidencia persistente del cumplimiento de una tarea operativa."""

    __tablename__ = "task_completion_records"
    __table_args__ = (
        db.UniqueConstraint("task_id", name="uq_task_completion_records_task_id"),
        db.Index("ix_task_completion_records_finca_id", "finca_id"),
        db.Index("ix_task_completion_records_completed_at", "completed_at"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    task_id = db.Column(
        db.Integer, db.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    completed_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    completed_at = db.Column(db.DateTime, nullable=False, server_default=db.func.now())
    notes = db.Column(db.Text, nullable=True)

    task = db.relationship("Tasks", back_populates="completion_record")
    completed_by_user = db.relationship(
        "User", foreign_keys=[completed_by], lazy="selectin"
    )

    _namespace_fields = [
        "id",
        "task_id",
        "finca_id",
        "completed_by",
        "completed_by_name",
        "completed_at",
        "notes",
        "created_at",
        "updated_at",
    ]
    _filterable_fields = ["task_id", "finca_id", "completed_by", "completed_at"]
    _sortable_fields = ["id", "completed_at", "created_at"]
    _required_fields = ["task_id", "finca_id"]
    _unique_fields = ["task_id"]

    @property
    def completed_by_name(self):
        return getattr(self.completed_by_user, "fullname", None)
