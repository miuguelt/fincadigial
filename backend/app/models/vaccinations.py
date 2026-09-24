from app import db
from app.models.base_model import BaseModel


class Vaccinations(BaseModel):
    """Modelo para vacunaciones aplicadas a animales optimizado para namespaces"""

    __tablename__ = "vaccinations"
    # Índices de rendimiento para historial de vacunaciones y consultas recientes
    __table_args__ = (
        db.Index("ix_vaccinations_animal_date", "animal_id", "vaccination_date"),
        db.Index("ix_vaccinations_created_at", "created_at"),
        db.Index("ix_vaccinations_finca_id", "finca_id"),
        db.Index("ix_vaccinations_finca_date", "finca_id", "vaccination_date"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    vaccine_id = db.Column(db.Integer, db.ForeignKey("vaccines.id"), nullable=False)
    vaccination_date = db.Column(db.Date, nullable=False)
    dosis = db.Column(db.String(100), nullable=True)  # Dosis aplicada (ej: "2ml SC")
    batch_number = db.Column(
        db.String(80), nullable=True
    )  # Número de lote del producto
    next_due_date = db.Column(db.Date, nullable=True)  # Fecha próxima aplicación
    notes = db.Column(db.String(500), nullable=True)  # Observaciones del aplicador
    performed_by = db.Column(
        db.Integer, db.ForeignKey("user.id"), nullable=True
    )  # Quien aplicó
    apprentice_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    instructor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    # Episodio de enfermedad al que pertenece esta vacunación (seguimiento sanidad)
    animal_disease_id = db.Column(
        db.Integer, db.ForeignKey("animal_diseases.id"), nullable=True
    )
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    kb_codigo = db.Column(db.String(20), nullable=True)  # Vinculo con KB Calendario

    # Configuración específica para namespaces
    _namespace_fields = [
        "id",
        "animal_id",
        "vaccine_id",
        "vaccination_date",
        "dosis",
        "batch_number",
        "next_due_date",
        "notes",
        "performed_by",
        "apprentice_id",
        "instructor_id",
        "animal_disease_id",
        "finca_id",
        "kb_codigo",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animals": {"fields": ["id", "record", "sex", "status"], "depth": 1},
        "vaccines": {"fields": ["id", "name", "type"], "depth": 1},
        "animal_disease": {"fields": ["id", "disease_id", "status"], "depth": 1},
        "apprentice": {"fields": ["id", "fullname", "role"], "depth": 1},
        "instructor": {"fields": ["id", "fullname", "role"], "depth": 1},
    }
    _searchable_fields = []
    _filterable_fields = [
        "animal_id",
        "vaccine_id",
        "instructor_id",
        "apprentice_id",
        "animal_disease_id",
        "vaccination_date",
        "finca_id",
        "created_at",
    ]
    _sortable_fields = ["id", "vaccination_date", "created_at", "updated_at"]
    # Allow instructor_id optional for test scenarios where an instructor entity isn't present
    _required_fields = ["animal_id", "vaccine_id", "vaccination_date"]
    _unique_fields = []

    # Relaciones optimizadas
    animals = db.relationship("Animals", back_populates="vaccinations", lazy="selectin")
    vaccines = db.relationship(
        "Vaccines", back_populates="vaccinations", lazy="selectin"
    )
    performer = db.relationship("User", foreign_keys=[performed_by], lazy="selectin")
    apprentice = db.relationship(
        "User",
        foreign_keys=[apprentice_id],
        back_populates="vaccines_as_apprentice",
        lazy="selectin",
    )
    instructor = db.relationship(
        "User",
        foreign_keys=[instructor_id],
        back_populates="vaccines_as_instructor",
        lazy="selectin",
    )
    animal_disease = db.relationship(
        "AnimalDiseases", foreign_keys=[animal_disease_id], lazy="selectin"
    )

    @classmethod
    def create(cls, commit=True, **kwargs):
        """Crea la vacunación y la espeja en la bitácora unificada."""
        instance = super().create(commit=False, **kwargs)
        instance._mirror_to_health_history()
        if commit:
            db.session.commit()
            db.session.refresh(instance)
        return instance

    def update(self, commit=True, **kwargs):
        """Actualiza la vacunación y su espejo en la bitácora."""
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
        """Espeja la vacunación en la bitácora unificada del animal."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import upsert_event

        vaccine_name = self.vaccines.name if self.vaccines else self.vaccine_id
        detail = f"Vacunación: {vaccine_name}"
        if self.dosis:
            detail = f"{detail} | Dosis: {self.dosis}"
        if self.batch_number:
            detail = f"{detail} | Lote: {self.batch_number}"
        performer = (
            self.performed_by or self.instructor_id or self.apprentice_id or None
        )

        upsert_event(
            event_type=HealthEventType.Vaccination,
            reference_kind="vaccination",
            reference_id=self.id,
            animal_id=self.animal_id,
            finca_id=self.finca_id,
            event_date=self.vaccination_date,
            description=detail,
            performed_by=performer,
        )

    def _remove_health_history_mirror(self):
        """Retira el espejo de la bitácora."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import drop_event

        drop_event(HealthEventType.Vaccination, "vaccination", self.id)

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if "vaccination_date" in data and not data["vaccination_date"]:
            errors.append("La fecha de vacunación no puede estar vacía")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError

            raise ValidationError("; ".join(errors), code="validation_error")

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        data = super()._validate_and_normalize(data, is_update, instance_id)
        # Si se vincula una vacunación a un episodio, deben coincidir animal/finca.
        episode_id = data.get("animal_disease_id")
        animal_id = data.get("animal_id")
        if episode_id is not None:
            from app.models.animalDiseases import AnimalDiseases
            from app.models.base_model import ValidationError

            episode = AnimalDiseases.query.get(episode_id)
            if not episode:
                raise ValidationError(
                    "El episodio de enfermedad seleccionado no existe",
                    code="validation_error",
                )
            if animal_id is not None and episode.animal_id != int(animal_id):
                raise ValidationError(
                    "El episodio no corresponde a la res seleccionada",
                    code="validation_error",
                )
        return data

    def __repr__(self):
        return f"<Vaccination {self.id}: Animal {self.animal_id} - Vaccine {self.vaccine_id}>"
