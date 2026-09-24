from app import db
from app.models.base_model import BaseModel


class Treatments(BaseModel):
    """Modelo para tratamientos aplicados a animales optimizado para namespaces"""

    __tablename__ = "treatments"
    # Índices de rendimiento para historial y consultas recientes
    __table_args__ = (
        db.Index("ix_treatments_animal_date", "animal_id", "treatment_date"),
        db.Index("ix_treatments_created_at", "created_at"),
        db.Index("ix_treatments_finca_id", "finca_id"),
        db.Index("ix_treatments_finca_date", "finca_id", "treatment_date"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    treatment_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.String(255), nullable=False)
    frequency = db.Column(db.String(255), nullable=False)
    observations = db.Column(db.String(255), nullable=True)
    dosis = db.Column(db.String(255), nullable=False)
    withdrawal_days = db.Column(db.Integer, nullable=True, default=0)
    withdrawal_end_date = db.Column(db.Date, nullable=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    control_id = db.Column(db.Integer, db.ForeignKey("control.id"), nullable=True)
    # Episodio de enfermedad al que pertenece este tratamiento (seguimiento sanidad)
    animal_disease_id = db.Column(
        db.Integer, db.ForeignKey("animal_diseases.id"), nullable=True
    )
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    performed_by = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=True
    )  # Quién realizó el tratamiento
    cost = db.Column(db.Numeric(10, 2), nullable=True)  # Costo del tratamiento (COP)

    # Configuración específica para namespaces
    _namespace_fields = [
        "id",
        "treatment_date",
        "description",
        "frequency",
        "observations",
        "dosis",
        "withdrawal_days",
        "withdrawal_end_date",
        "animal_id",
        "control_id",
        "animal_disease_id",
        "finca_id",
        "performed_by",
        "cost",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animals": {"fields": ["id", "record", "sex", "status"], "depth": 1},
        "control": {"fields": ["id", "health_status"]},
        "animal_disease": {"fields": ["id", "disease_id", "status"], "depth": 1},
        "vaccines_treatments": {"fields": ["id", "vaccine_id"], "depth": 1},
        "medication_treatments": {"fields": ["id", "medication_id"], "depth": 1},
    }
    _searchable_fields = ["description", "observations"]
    _filterable_fields = [
        "animal_id",
        "control_id",
        "animal_disease_id",
        "treatment_date",
        "finca_id",
        "created_at",
    ]
    _sortable_fields = ["id", "treatment_date", "created_at", "updated_at"]
    _required_fields = [
        "treatment_date",
        "description",
        "frequency",
        "dosis",
        "animal_id",
    ]
    _unique_fields = []
    _input_aliases = {
        "diagnosis": "description",
        # Legacy clients called the end of the withdrawal period `end_date`.
        # It must remain a date, never be stored as a clinical observation.
        "end_date": "withdrawal_end_date",
    }

    # Relaciones optimizadas
    animals = db.relationship("Animals", back_populates="treatments", lazy="selectin")
    control = db.relationship("Control", foreign_keys=[control_id], lazy="selectin")
    performer = db.relationship("User", foreign_keys=[performed_by], lazy="selectin")
    animal_disease = db.relationship(
        "AnimalDiseases", foreign_keys=[animal_disease_id], lazy="selectin"
    )
    vaccines_treatments = db.relationship(
        "TreatmentVaccines", back_populates="treatments", lazy="dynamic"
    )
    medication_treatments = db.relationship(
        "TreatmentMedications", back_populates="treatments", lazy="dynamic"
    )

    @classmethod
    def create(cls, commit=True, **kwargs):
        # A quick/offline treatment may carry its medication and inventory
        # selection in the same payload. Persist the treatment and bridge
        # together so the bridge can apply the stock exit atomically.
        medication_id = kwargs.pop("medication_id", None)
        lot_id = kwargs.pop("lot_id", None)
        quantity = kwargs.pop("quantity", 0)
        instance = super().create(commit=False, **kwargs)
        if medication_id:
            from app.models.treatment_medications import TreatmentMedications

            TreatmentMedications.create(
                commit=False,
                treatment_id=instance.id,
                medication_id=medication_id,
                lot_id=lot_id,
                quantity=quantity,
            )
        instance._mirror_to_health_history()
        if commit:
            db.session.commit()
            db.session.refresh(instance)
        if instance and instance.finca_id:
            from app.models.livestock_summary import LivestockSummary

            summary = LivestockSummary.get_for_finca(instance.finca_id)
            summary.recalculate()
        return instance

    def update(self, commit=True, **kwargs):
        updated_instance = super().update(commit=False, **kwargs)
        self._mirror_to_health_history()
        if commit:
            db.session.commit()
            db.session.refresh(self)
        if self.finca_id:
            from app.models.livestock_summary import LivestockSummary

            summary = LivestockSummary.get_for_finca(self.finca_id)
            summary.recalculate()
        return updated_instance

    def delete(self, commit=True, hard_delete=False):
        f_id = self.finca_id
        try:
            # A treatment is the business event that owns these applications.
            # Removing it must reverse every linked stock exit as well.
            for application in self.medication_treatments.all():
                application.delete(commit=False, hard_delete=hard_delete)
            for application in self.vaccines_treatments.all():
                application.delete(commit=False, hard_delete=hard_delete)
            self._remove_health_history_mirror()
            result = super().delete(commit=False, hard_delete=hard_delete)
            if commit:
                db.session.commit()
        except Exception:
            db.session.rollback()
            raise
        if f_id:
            from app.models.livestock_summary import LivestockSummary

            summary = LivestockSummary.get_for_finca(f_id)
            summary.recalculate()
        return result

    def restore(self, commit=True):
        """Recrea el espejo de la bitácora."""
        result = super().restore(commit=commit)
        self._mirror_to_health_history()
        if commit:
            db.session.commit()
        return result

    def _mirror_to_health_history(self):
        """Espeja el tratamiento en la bitácora unificada del animal."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import upsert_event

        detail = f"{self.description}"
        if self.dosis:
            detail = f"{detail} | Dosis: {self.dosis}"
        if self.observations:
            detail = f"{detail} | {self.observations}"

        upsert_event(
            event_type=HealthEventType.Treatment,
            reference_kind="treatment",
            reference_id=self.id,
            animal_id=self.animal_id,
            finca_id=self.finca_id,
            event_date=self.treatment_date,
            description=detail,
            performed_by=self.performed_by,
        )

    def _remove_health_history_mirror(self):
        """Retira el espejo de la bitácora."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import drop_event

        drop_event(HealthEventType.Treatment, "treatment", self.id)

    def to_namespace_dict(
        self, include_relations: bool = False, depth: int = 1, fields=None
    ):
        """Serializa el modelo a diccionario para namespace manteniendo compatibilidad con BaseModel"""
        return super().to_namespace_dict(
            include_relations=include_relations, depth=depth, fields=fields
        )

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if "description" in data and not data["description"]:
            errors.append("La descripción no puede estar vacía")
        if "dosis" in data and not data["dosis"]:
            errors.append("La dosis no puede estar vacía")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError

            raise ValidationError("; ".join(errors), code="validation_error")

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        data = super()._validate_and_normalize(data, is_update, instance_id)
        # El episodio vinculado debe existir y pertenecer al mismo animal/finca.
        # En un PATCH los campos omitidos deben resolverse contra el registro
        # actual; de lo contrario se podía cambiar la res sin validar el caso
        # existente, o vincular el tratamiento a un caso de otra res.
        current = cls.get_by_id(instance_id) if is_update and instance_id else None
        episode_id = (
            data.get("animal_disease_id")
            if "animal_disease_id" in data
            else getattr(current, "animal_disease_id", None)
        )
        animal_id = (
            data.get("animal_id")
            if "animal_id" in data
            else getattr(current, "animal_id", None)
        )
        if episode_id is not None:
            from app.models.animalDiseases import AnimalDiseases

            episode = AnimalDiseases.query.get(episode_id)
            if not episode:
                from app.models.base_model import ValidationError

                raise ValidationError(
                    "El episodio de enfermedad seleccionado no existe",
                    code="validation_error",
                )
            if animal_id is not None and episode.animal_id != int(animal_id):
                from app.models.base_model import ValidationError

                raise ValidationError(
                    "El episodio no corresponde a la res seleccionada",
                    code="validation_error",
                )
            treatment_finca_id = data.get("finca_id") or getattr(current, "finca_id", None)
            if (
                treatment_finca_id is not None
                and episode.finca_id != int(treatment_finca_id)
            ):
                from app.models.base_model import ValidationError

                raise ValidationError(
                    "El episodio no pertenece a la misma finca del tratamiento",
                    code="validation_error",
                )
            from app.utils.tenant_context import get_current_finca_id

            context_finca_id = get_current_finca_id()
            if (
                context_finca_id is not None
                and episode.finca_id != context_finca_id
            ):
                from app.models.base_model import ValidationError

                raise ValidationError(
                    "El episodio pertenece a otra finca",
                    code="validation_error",
                )
        return data

    def __repr__(self):
        return f"<Treatment {self.id}: {self.description[:30]}...>"
