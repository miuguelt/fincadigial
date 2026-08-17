from app import db
import enum
from datetime import date
from app.models.base_model import BaseModel, ValidationError


class HealthEventType(enum.Enum):
    Checkup = "Checkup"
    Vaccination = "Vaccination"
    Treatment = "Treatment"
    Disease = "Disease"
    Surgery = "Surgery"
    Deworming = "Deworming"


class AnimalHealthHistory(BaseModel):
    """Historial de salud unificado por animal.

    Centraliza todos los eventos de salud (controles, vacunas, tratamientos,
    enfermedades) en una tabla escalable con tipo de evento.
    """

    __tablename__ = "animal_health_history"
    __table_args__ = (
        db.Index("ix_health_history_animal_date", "animal_id", "event_date"),
        db.Index("ix_health_history_type", "event_type"),
        db.Index("ix_health_history_finca", "finca_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    event_type = db.Column(db.Enum(HealthEventType), nullable=False)
    event_date = db.Column(db.Date, nullable=False)
    weight = db.Column(db.Float, nullable=True)
    height = db.Column(db.Float, nullable=True)
    temperature = db.Column(db.Float, nullable=True)
    health_status = db.Column(db.String(50), nullable=True)
    description = db.Column(db.Text, nullable=True)
    performed_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    reference_id = db.Column(db.Integer, nullable=True)

    animal = db.relationship(
        "Animals", back_populates="health_history", lazy="selectin"
    )
    finca = db.relationship("Finca", backref="health_history_records", lazy="selectin")
    performer = db.relationship(
        "User", backref="health_events_performed", lazy="selectin"
    )

    _namespace_fields = [
        "id",
        "animal_id",
        "finca_id",
        "event_type",
        "event_date",
        "weight",
        "height",
        "temperature",
        "health_status",
        "description",
        "performed_by",
        "reference_id",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animal": {"fields": ["id", "record", "sex", "status"], "depth": 1},
    }
    _searchable_fields = ["description", "health_status"]
    _filterable_fields = [
        "animal_id",
        "event_type",
        "event_date",
        "finca_id",
        "health_status",
    ]
    _sortable_fields = ["id", "event_date", "created_at"]
    _required_fields = ["animal_id", "event_type", "event_date"]
    _unique_fields = []
    _enum_fields = {"event_type": HealthEventType}

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        if "event_date" in data and data["event_date"]:
            if data["event_date"] > date.today():
                raise ValidationError("La fecha del evento no puede ser futura")
        for field in ["weight", "height", "temperature"]:
            if field in data and data.get(field) is not None:
                val = data[field]
                if not isinstance(val, (int, float)) or val <= 0:
                    raise ValidationError(f"'{field}' debe ser un número positivo")
        return super()._validate_and_normalize(data, is_update, instance_id)

    @classmethod
    def get_timeline(cls, animal_id, limit=50):
        """Obtiene la línea de tiempo de salud de un animal."""
        return (
            cls.query.filter_by(animal_id=animal_id)
            .order_by(db.desc(cls.event_date))
            .limit(limit)
            .all()
        )

    def __repr__(self):
        return f"<HealthHistory {self.event_type.value} - Animal {self.animal_id} - {self.event_date}>"
