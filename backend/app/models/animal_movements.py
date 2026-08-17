from app import db
from app.models.base_model import BaseModel
import enum


class MovementType(enum.Enum):
    """Types of movements allowed in Colombian livestock regulations"""

    Traslado_Interno = "Traslado_Interno"
    Venta_Traslado_Externo = "Venta_Traslado_Externo"
    Venta_En_Predio = "Venta_En_Predio"

    @classmethod
    def get_choices(cls) -> list[tuple[str, str]]:
        return [(choice.value, choice.value) for choice in cls]

    def __str__(self) -> str:
        return str(self.value)


class AnimalMovement(BaseModel):
    """Model for traceability of livestock sales and transfers under ICA/SINIGAN regulations"""

    __tablename__ = "animal_movements"
    __table_args__ = (
        db.Index("ix_movements_animal_id", "animal_id"),
        db.Index("ix_movements_finca_origen_id", "finca_origen_id"),
        db.Index("ix_movements_finca_destino_id", "finca_destino_id"),
        db.Index("ix_movements_fecha_movimiento", "fecha_movimiento"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    animal_id = db.Column(
        db.Integer, db.ForeignKey("animals.id", ondelete="CASCADE"), nullable=False
    )
    finca_origen_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    finca_destino_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=True)

    finca_destino_externa = db.Column(db.String(150), nullable=True)
    rpp_destino_externo = db.Column(
        db.String(12), nullable=True
    )  # ICA RPP is a 12-digit code
    tipo_movimiento = db.Column(db.Enum(MovementType), nullable=False)
    fecha_movimiento = db.Column(db.Date, nullable=False)

    # Financial sales details
    precio_venta = db.Column(db.Numeric(12, 2), nullable=True)
    comprador = db.Column(db.String(150), nullable=True)
    comprador_nit = db.Column(db.String(20), nullable=True)

    # Colombian Regulatory Details (ICA/SINIGAN)
    arete_sinigan = db.Column(db.String(50), nullable=True)
    guia_movilizacion = db.Column(
        db.String(50), nullable=True
    )  # GSMI ICA (mandatory for transit)
    ruv_vacunacion = db.Column(db.String(50), nullable=True)  # RUV vaccine record

    # Transport / Logistics details (To prevent abigeato/theft)
    placa_vehiculo = db.Column(db.String(10), nullable=True)
    nombre_conductor = db.Column(db.String(100), nullable=True)
    cedula_conductor = db.Column(db.String(20), nullable=True)
    precinto_seguridad = db.Column(db.String(50), nullable=True)  # Security seal

    notes = db.Column(db.String(500), nullable=True)

    # Relationships
    animal = db.relationship(
        "Animals",
        foreign_keys=[animal_id],
        backref=db.backref("movements", cascade="all, delete-orphan"),
        lazy="selectin",
    )
    finca_origen = db.relationship(
        "Finca",
        foreign_keys=[finca_origen_id],
        backref="movements_sent",
        lazy="selectin",
    )
    finca_destino = db.relationship(
        "Finca",
        foreign_keys=[finca_destino_id],
        backref="movements_received",
        lazy="selectin",
    )

    _namespace_fields = [
        "id",
        "animal_id",
        "finca_origen_id",
        "finca_destino_id",
        "finca_destino_externa",
        "rpp_destino_externo",
        "tipo_movimiento",
        "fecha_movimiento",
        "precio_venta",
        "comprador",
        "comprador_nit",
        "arete_sinigan",
        "guia_movilizacion",
        "ruv_vacunacion",
        "placa_vehiculo",
        "nombre_conductor",
        "cedula_conductor",
        "precinto_seguridad",
        "notes",
        "created_at",
        "updated_at",
    ]

    _namespace_relations = {
        "animal": {"fields": ["id", "record", "sex"], "depth": 1},
        "finca_origen": {"fields": ["id", "name"], "depth": 1},
        "finca_destino": {"fields": ["id", "name"], "depth": 1},
    }

    _filterable_fields = [
        "animal_id",
        "finca_origen_id",
        "finca_destino_id",
        "tipo_movimiento",
        "fecha_movimiento",
    ]
    _searchable_fields = [
        "comprador",
        "guia_movilizacion",
        "placa_vehiculo",
        "nombre_conductor",
        "notes",
    ]
    _sortable_fields = ["id", "fecha_movimiento", "created_at"]
    _required_fields = ["animal_id", "tipo_movimiento", "fecha_movimiento"]
    _enum_fields = {"tipo_movimiento": MovementType}

    def __repr__(self) -> str:
        return f"<AnimalMovement {self.tipo_movimiento.value} - Animal {self.animal_id} - Date {self.fecha_movimiento}>"
