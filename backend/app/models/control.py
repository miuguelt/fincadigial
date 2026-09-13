from app import db
import enum
from datetime import date
from app.models.base_model import BaseModel, ValidationError


class HealthStatus(enum.Enum):
    """Estados de salud para controles veterinarios"""

    Excelente = "Excelente"
    Bueno = "Bueno"
    Regular = "Regular"
    Malo = "Malo"
    Sano = "Sano"

    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]

    def __str__(self):
        """Devuelve el valor como string para facilitar la conversión"""
        return str(self.value)

    def __repr__(self):
        """Representación detallada para debug"""
        return f"{self.__class__.__name__}.{self.name}"


class Control(BaseModel):
    """Modelo para controles de salud de animales optimizado para namespaces"""

    __tablename__ = "control"
    # Índices para acelerar historiales por animal y consultas recientes
    __table_args__ = (
        db.Index("ix_control_animal_checkup", "animal_id", "checkup_date"),
        db.Index("ix_control_created_at", "created_at"),
        db.Index("ix_control_finca_id", "finca_id"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    checkup_date = db.Column(db.Date, nullable=False)
    health_status = db.Column(db.Enum(HealthStatus), nullable=False)
    # Physical measurement fields and description are optional; kept nullable for test flexibility
    weight = db.Column(db.Float, nullable=True)  # nullable for tests
    height = db.Column(db.Float, nullable=True)  # nullable for tests
    temperature = db.Column(db.Float, nullable=True)  # °C — control clínico
    description = db.Column(db.String(255), nullable=True)  # nullable for tests
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    # Episodio de enfermedad al que pertenece este control (seguimiento sanidad)
    animal_disease_id = db.Column(
        db.Integer, db.ForeignKey("animal_diseases.id"), nullable=True
    )
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    # Configuración específica para namespaces
    _namespace_fields = [
        "id",
        "checkup_date",
        "health_status",
        "weight",
        "height",
        "temperature",
        "description",
        "animal_id",
        "animal_disease_id",
        "finca_id",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animals": {"fields": ["id", "record", "sex", "status"], "depth": 1},
        "animal_disease": {"fields": ["id", "disease_id", "status"], "depth": 1},
    }
    _searchable_fields = ["description"]
    _filterable_fields = [
        "animal_id",
        "health_status",
        "animal_disease_id",
        "checkup_date",
        "finca_id",
        "created_at",
    ]
    _sortable_fields = ["id", "checkup_date", "created_at", "updated_at"]
    _required_fields = ["checkup_date", "health_status", "animal_id"]
    _unique_fields = []
    _enum_fields = {"health_status": HealthStatus}
    _input_aliases = {
        "control_date": "checkup_date",
        "observations": "description",
    }

    # Relación optimizada - FIXED: Changed from lazy='select' to lazy='selectin' to prevent N+1 queries
    animals = db.relationship("Animals", back_populates="controls", lazy="selectin")
    animal_disease = db.relationship(
        "AnimalDiseases", foreign_keys=[animal_disease_id], lazy="selectin"
    )

    @classmethod
    def create(cls, commit=True, **kwargs):
        """
        Sobreescribe create para actualizar el peso del animal si se provee.

        Actualiza ``animals.weight`` solo cuando este control es el control más
        reciente (por ``checkup_date``) del animal: un control con fecha
        retroactiva no debe pisar el peso actual. Toda la operación (control +
        animal) se persiste en un ÚNICO commit para evitar estados parciales
        (control guardado con peso de animal sin actualizar o viceversa).
        """
        instance = super().create(commit=False, **kwargs)

        # El control recién creado ya está en el session (flush) y puede
        # participar en la selección del último peso del animal.
        if instance.weight is not None and instance.animal_id:
            cls._sync_animal_weight(instance.animal_id)

        instance._mirror_to_health_history()

        if commit:
            db.session.commit()
            try:
                db.session.refresh(instance)
            except Exception:
                pass
        return instance

    @classmethod
    def _sync_animal_weight(cls, animal_id):
        """Sincroniza el peso materializado con el último control con peso.

        El cambio queda en la transacción del control; el método nunca hace
        commit por sí mismo para que create/update/delete/bulk sean atómicos.
        Si no existe un control con peso, se conserva el peso materializado del
        animal, que puede provenir de una captura manual anterior.
        """
        if not animal_id:
            return

        from app.models.animals import Animals

        animal = Animals.query.get(animal_id)
        latest = (
            cls.query.filter_by(animal_id=animal_id, is_deleted=False)
            .filter(cls.weight.isnot(None))
            .order_by(cls.checkup_date.desc(), cls.id.desc())
            .first()
        )
        if animal and latest and animal.weight != latest.weight:
            animal.update(weight=latest.weight, commit=False)

    def update(self, commit=True, **kwargs):
        """Sobreescribe update para mantener el espejo de la bitácora."""
        previous_animal_id = self.animal_id
        result = super().update(commit=False, **kwargs)
        self._mirror_to_health_history()
        self._sync_animal_weight(previous_animal_id)
        if self.animal_id != previous_animal_id:
            self._sync_animal_weight(self.animal_id)
        if commit:
            db.session.commit()
            try:
                db.session.refresh(self)
            except Exception:
                pass
        return result

    def delete(self, commit=True, hard_delete=False):
        """Sobreescribe delete para retirar el espejo de la bitácora."""
        animal_id = self.animal_id
        self._remove_health_history_mirror()
        result = super().delete(commit=False, hard_delete=hard_delete)
        self._sync_animal_weight(animal_id)
        if commit:
            db.session.commit()
        return result

    def restore(self, commit=True):
        """Sobreescribe restore para recrear el espejo de la bitácora."""
        result = super().restore(commit=False)
        self._mirror_to_health_history()
        self._sync_animal_weight(self.animal_id)
        if commit:
            db.session.commit()
        return result

    @classmethod
    def bulk_create(cls, items_data):
        """Crea controles en lote conservando los efectos del create individual."""
        instances = [cls.create(commit=False, **data) for data in items_data]
        db.session.commit()
        for instance in instances:
            db.session.refresh(instance)
        return instances

    @classmethod
    def bulk_update(cls, updates_data):
        """Actualiza controles en lote conservando espejo y peso materializado."""
        from app.utils.tenant_context import apply_tenant_filter

        updated_instances = []
        for update_data in updates_data:
            instance_id = update_data.get("id")
            if not instance_id:
                continue

            instance = (
                apply_tenant_filter(db.session.query(cls), cls)
                .filter(cls.id == instance_id)
                .first()
            )
            if not instance:
                continue

            payload = {key: value for key, value in update_data.items() if key != "id"}
            instance.update(commit=False, **payload)
            updated_instances.append(instance)

        db.session.commit()
        for instance in updated_instances:
            db.session.refresh(instance)
        return updated_instances

    def _mirror_to_health_history(self):
        """Espeja el control en la bitácora unificada del animal."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import upsert_event

        upsert_event(
            event_type=HealthEventType.Checkup,
            reference_kind="control",
            reference_id=self.id,
            animal_id=self.animal_id,
            finca_id=self.finca_id,
            event_date=self.checkup_date,
            weight=self.weight,
            height=self.height,
            temperature=self.temperature,
            health_status=self.health_status.value if self.health_status else None,
            description=self.description,
        )

    def _remove_health_history_mirror(self):
        """Retira el espejo de la bitácora."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import drop_event

        drop_event(HealthEventType.Checkup, "control", self.id)

    @classmethod
    def related_invalidations(cls, instance):
        """Modelos relacionados que quedan obsoletos tras guardar un control.

        Cada write de ``Control`` con peso muta ``animals.weight`` y, por lo
        tanto, invalida la caché de ``Animals`` (listado + detalle) y publica el
        evento ``animals`` para que los clientes conectados por SSE refresquen
        la tarjeta del animal en tiempo real.
        """
        if getattr(instance, "weight", None) and getattr(instance, "animal_id", None):
            return [
                {
                    "model": "Animals",
                    "endpoint": "animals",
                    "record_id": instance.animal_id,
                }
            ]
        return []

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        """
        Sobrescribe para añadir validaciones y normalizaciones específicas de Control.
        """
        # Llamar primero a la validación y normalización base (convierte fechas a datetime.date, etc.)
        data = super()._validate_and_normalize(data, is_update, instance_id)

        # Validar fecha de control
        if "checkup_date" in data and data["checkup_date"]:
            check_date = data["checkup_date"]
            if isinstance(check_date, str):
                try:
                    check_date = date.fromisoformat(check_date)
                except (ValueError, TypeError):
                    pass
            if isinstance(check_date, date) and check_date > date.today():
                raise ValidationError("La fecha de control no puede ser futura")

        # Validar medidas físicas (permitir int o float)
        for field in ["weight", "height", "temperature"]:
            if field in data and data.get(field) is not None:
                val = data[field]
                if not isinstance(val, (int, float)) or val <= 0:
                    raise ValidationError(
                        f"El campo '{field}' debe ser un número positivo"
                    )
        # Rango fisiológico razonable para temperatura bovina (guardia amistosa)
        temperature = data.get("temperature")
        if isinstance(temperature, (int, float)) and not (30 <= temperature <= 45):
            raise ValidationError(
                "La temperatura debe estar entre 30 y 45 °C (rango bovino)"
            )

        # Validar animal_id
        if "animal_id" in data and data.get("animal_id") is not None:
            if not isinstance(data["animal_id"], int) or data["animal_id"] <= 0:
                raise ValidationError(
                    "El 'animal_id' debe ser un número entero positivo"
                )

        return data

    def __repr__(self):
        return f"<Control {self.id}: {self.health_status.value if self.health_status else 'N/A'} on {self.checkup_date}>"
