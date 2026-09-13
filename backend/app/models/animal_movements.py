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
    tipo_movimiento = db.Column(
        db.Enum(MovementType, native_enum=False, length=50),
        nullable=False,
        default=MovementType.Traslado_Interno,
    )
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

    @classmethod
    def create(cls, commit=True, **kwargs):
        """Crea el movimiento y lo espeja en la bitácora unificada."""
        instance = super().create(commit=False, **kwargs)
        instance._mirror_to_health_history()
        if commit:
            db.session.commit()
            db.session.refresh(instance)
        return instance

    def update(self, commit=True, **kwargs):
        """Actualiza el movimiento y su espejo en la bitácora."""
        result = super().update(commit=False, **kwargs)
        self._mirror_to_health_history()
        if commit:
            db.session.commit()
            db.session.refresh(self)
        return result

    def delete(self, commit=True, hard_delete=False):
        """Retira el espejo de la bitácora."""
        self._remove_health_history_mirror()
        return super().delete(commit=commit, hard_delete=hard_delete)

    def restore(self, commit=True):
        """Recrea el espejo de la bitácora."""
        result = super().restore(commit=commit)
        self._mirror_to_health_history()
        if commit:
            db.session.commit()
        return result

    def _mirror_to_health_history(self):
        """Espeja el movimiento ICA en la bitácora unificada del animal."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import upsert_event

        movement = self.tipo_movimiento.value if self.tipo_movimiento else "Movimiento"
        destino = "finca externa"
        if self.finca_destino_externa:
            destino = self.finca_destino_externa
        elif self.finca_destino:
            destino = self.finca_destino.name
        detail = f"{movement} → {destino}"
        if self.fecha_movimiento:
            detail = f"{detail} | Fecha: {self.fecha_movimiento}"
        if self.notes:
            detail = f"{detail} | {self.notes}"

        upsert_event(
            event_type=HealthEventType.Movement,
            reference_kind="animal_movement",
            reference_id=self.id,
            animal_id=self.animal_id,
            finca_id=self.finca_origen_id,
            event_date=self.fecha_movimiento,
            description=detail,
        )

    def _remove_health_history_mirror(self):
        """Retira el espejo de la bitácora."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import drop_event

        drop_event(HealthEventType.Movement, "animal_movement", self.id)

    def __repr__(self) -> str:
        return f"<AnimalMovement {self.tipo_movimiento.value} - Animal {self.animal_id} - Date {self.fecha_movimiento}>"
