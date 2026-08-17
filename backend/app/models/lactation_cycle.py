"""Modelo para tracking de ciclos de lactancia"""

import enum
import logging
from datetime import date, timedelta
from app import db
from app.models.base_model import BaseModel

logger = logging.getLogger(__name__)


class LactationStatus(enum.Enum):
    """Estados del ciclo de lactancia"""

    Active = "Active"
    DryingOff = "DryingOff"
    Dry = "Dry"
    Completed = "Completed"

    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]

    def __str__(self):
        return str(self.value)


class LactationCycle(BaseModel):
    """Modelo para tracking de ciclos de lactancia por animal"""

    __tablename__ = "lactation_cycles"

    __table_args__ = (
        db.Index("ix_lactation_animal_id", "animal_id"),
        db.Index("ix_lactation_finca_id", "finca_id"),
        db.Index("ix_lactation_status", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    # Fechas clave del ciclo
    calving_date = db.Column(db.Date, nullable=False)
    dry_off_date = db.Column(db.Date, nullable=True)
    expected_dry_off_date = db.Column(db.Date, nullable=True)

    # Estado y número de lactancia
    lactation_number = db.Column(db.Integer, nullable=False, default=1)
    status = db.Column(
        db.Enum(LactationStatus), nullable=False, default=LactationStatus.Active
    )

    # Métricas de producción
    peak_liters = db.Column(db.Float, nullable=True)
    peak_date = db.Column(db.Date, nullable=True)
    total_liters_lactation = db.Column(db.Float, nullable=True, default=0.0)

    notes = db.Column(db.String(500), nullable=True)

    _namespace_fields = [
        "id",
        "animal_id",
        "finca_id",
        "calving_date",
        "dry_off_date",
        "expected_dry_off_date",
        "lactation_number",
        "status",
        "peak_liters",
        "peak_date",
        "total_liters_lactation",
        "notes",
        "created_at",
        "updated_at",
    ]
    _filterable_fields = ["animal_id", "finca_id", "status", "lactation_number"]
    _sortable_fields = ["id", "calving_date", "lactation_number", "created_at"]
    _required_fields = ["animal_id", "calving_date", "lactation_number"]
    _enum_fields = {"status": LactationStatus}

    @property
    def days_in_milk(self) -> int:
        """Calcula días en leche desde el parto"""
        if (
            self.status == LactationStatus.Dry
            or self.status == LactationStatus.Completed
        ):
            if self.dry_off_date:
                return (self.dry_off_date - self.calving_date).days
        return (date.today() - self.calving_date).days

    @property
    def days_until_dry_off(self) -> int:
        """Calcula días restantes hasta el secado"""
        if self.expected_dry_off_date:
            delta = (self.expected_dry_off_date - date.today()).days
            return max(0, delta)
        return -1

    @classmethod
    def get_active_for_animal(cls, animal_id: int, finca_id: int):
        """Obtiene el ciclo de lactancia activo para un animal"""
        return (
            cls.query.filter_by(
                animal_id=animal_id, finca_id=finca_id, status=LactationStatus.Active
            )
            .order_by(cls.lactation_number.desc())
            .first()
        )

    @classmethod
    def get_cycles_for_animal(cls, animal_id: int, finca_id: int):
        """Obtiene todos los ciclos de lactancia para un animal"""
        return (
            cls.query.filter_by(animal_id=animal_id, finca_id=finca_id)
            .order_by(cls.lactation_number.desc())
            .all()
        )

    def __repr__(self):
        return f"<LactationCycle {self.id}: Animal {self.animal_id} - Lactancia #{self.lactation_number} ({self.status})>"
