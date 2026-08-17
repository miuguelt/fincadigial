from app import db
from app.models.base_model import BaseModel
import enum


class PlanType(enum.Enum):
    Sanitario = "Sanitario"
    Reproductivo = "Reproductivo"
    Nutricional = "Nutricional"
    Manejo = "Manejo General"
    Educativo = "Educativo / Práctica"


class PlanStatus(enum.Enum):
    Borrador = "Borrador"
    Activo = "Activo"
    Completado = "Completado"
    Cancelado = "Cancelado"


class ManagementPlan(BaseModel):
    """Modelo para Planes de Manejo Pedagógico y Ganadero (Ej: Plan Sanitario Anual)"""

    __tablename__ = "management_plans"
    __table_args__ = (
        db.Index("ix_mgmt_plans_finca_status", "finca_id", "status"),
        db.Index("ix_mgmt_plans_dates", "start_date", "end_date"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=True)
    plan_type = db.Column(db.Enum(PlanType), nullable=False)
    status = db.Column(db.Enum(PlanStatus), nullable=False, default=PlanStatus.Borrador)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    created_by_user = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    approved_by_user = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    _namespace_fields = [
        "id",
        "finca_id",
        "name",
        "description",
        "plan_type",
        "status",
        "start_date",
        "end_date",
        "created_by_user",
        "approved_by_user",
        "notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "creator": {"fields": ["id", "fullname", "role"], "depth": 1},
        "approver": {"fields": ["id", "fullname", "role"], "depth": 1},
    }
    _searchable_fields = ["name", "description", "notes"]
    _filterable_fields = ["finca_id", "plan_type", "status", "created_by_user"]
    _sortable_fields = ["id", "start_date", "end_date", "created_at"]
    _required_fields = [
        "finca_id",
        "name",
        "plan_type",
        "start_date",
        "end_date",
        "created_by_user",
    ]
    _enum_fields = {"plan_type": PlanType, "status": PlanStatus}

    # Relaciones
    creator = db.relationship("User", foreign_keys=[created_by_user], lazy="selectin")
    approver = db.relationship("User", foreign_keys=[approved_by_user], lazy="selectin")

    def __repr__(self):
        return f"<ManagementPlan {self.name} ({self.plan_type.value})>"
