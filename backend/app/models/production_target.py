"""Modelo para metas de producción láctea"""

import enum
import logging
from datetime import date
from app import db
from app.models.base_model import BaseModel

logger = logging.getLogger(__name__)


class TargetPeriod(enum.Enum):
    """Períodos de meta"""

    Daily = "Daily"
    Weekly = "Weekly"
    Monthly = "Monthly"

    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]

    def __str__(self):
        return str(self.value)


class ProductionTarget(BaseModel):
    """Modelo para metas de producción láctea por finca o animal"""

    __tablename__ = "production_targets"

    __table_args__ = (
        db.Index("ix_production_target_finca_id", "finca_id"),
        db.Index("ix_production_target_animal_id", "animal_id"),
        db.Index("ix_production_target_period", "period"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)

    # Configuración de la meta
    target_liters = db.Column(db.Float, nullable=False)
    period = db.Column(
        db.Enum(TargetPeriod), nullable=False, default=TargetPeriod.Daily
    )

    # Fechas de vigencia
    start_date = db.Column(db.Date, nullable=False, default=date.today)
    end_date = db.Column(db.Date, nullable=True)

    # Estado
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    notes = db.Column(db.String(500), nullable=True)

    _namespace_fields = [
        "id",
        "finca_id",
        "animal_id",
        "target_liters",
        "period",
        "start_date",
        "end_date",
        "is_active",
        "notes",
        "created_at",
        "updated_at",
    ]
    _filterable_fields = ["finca_id", "animal_id", "period", "is_active"]
    _sortable_fields = ["id", "start_date", "target_liters", "created_at"]
    _required_fields = ["finca_id", "target_liters", "period"]
    _enum_fields = {"period": TargetPeriod}

    @classmethod
    def get_active_for_finca(cls, finca_id: int, period: str = None):
        """Obtiene metas activas para una finca"""
        query = cls.query.filter_by(finca_id=finca_id, is_active=True)
        if period:
            query = query.filter_by(period=period)
        return query.order_by(cls.start_date.desc()).all()

    @classmethod
    def get_active_for_animal(cls, animal_id: int, finca_id: int, period: str = None):
        """Obtiene metas activas para un animal"""
        query = cls.query.filter_by(
            animal_id=animal_id, finca_id=finca_id, is_active=True
        )
        if period:
            query = query.filter_by(period=period)
        return query.order_by(cls.start_date.desc()).first()

    def __repr__(self):
        target = f"Animal {self.animal_id}" if self.animal_id else "Finca"
        return f"<ProductionTarget {self.id}: {target} - {self.target_liters}L/{self.period}>"
