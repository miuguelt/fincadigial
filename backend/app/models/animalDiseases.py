from app import db
from app.models.base_model import BaseModel, ValidationError


class AnimalDiseases(BaseModel):
    """Modelo para enfermedades diagnosticadas en animales"""

    __tablename__ = "animal_diseases"
    __table_args__ = (
        db.UniqueConstraint(
            "animal_id",
            "disease_id",
            "diagnosis_date",
            name="uq_animal_diseases_animal_disease_date",
        ),
        db.Index("ix_animal_diseases_finca_id", "finca_id"),
        db.Index("ix_animal_diseases_animal_id", "animal_id"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=False)
    disease_id = db.Column(db.Integer, db.ForeignKey("diseases.id"), nullable=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    diagnosis_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), nullable=False, default="Activo")
    # Gravedad clínica del episodio (Leve, Moderada, Severa, Crítica)
    severity = db.Column(db.String(20), nullable=True)
    # Fecha de alta/recuperación: cierra el caso y habilita los gráficos de duración
    recovery_date = db.Column(db.Date, nullable=True)
    # Notes optional to allow minimal test creation
    notes = db.Column(db.Text, nullable=True)  # nullable for tests
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    # Relaciones
    animal = db.relationship("Animals", back_populates="diseases", lazy="selectin")
    disease = db.relationship("Diseases", back_populates="animals", lazy="selectin")
    instructor = db.relationship("User", back_populates="diseases", lazy="selectin")
    progress = db.relationship(
        "AnimalDiseaseProgress",
        back_populates="episode",
        lazy="selectin",
        cascade="all, delete-orphan",
    )

    # Campos / relaciones para namespaces
    _namespace_fields = [
        "id",
        "animal_id",
        "disease_id",
        "instructor_id",
        "diagnosis_date",
        "status",
        "severity",
        "recovery_date",
        "notes",
        "finca_id",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "animal": {"fields": ["id", "record", "sex", "status"], "depth": 1},
        "disease": {"fields": ["id", "name"], "depth": 1},
        "instructor": {"fields": ["id", "fullname", "role"], "depth": 1},
    }
    # Configuraciones del modelo base
    _searchable_fields = ["notes", "status"]
    _filterable_fields = [
        "animal_id",
        "disease_id",
        "instructor_id",
        "status",
        "severity",
        "diagnosis_date",
        "recovery_date",
        "finca_id",
    ]
    _sortable_fields = ["id", "diagnosis_date", "recovery_date", "updated_at"]
    # Filtros de rango (sufijos _from/_to) sobre la fecha de diagnóstico
    _range_filter_fields = {
        "diagnosis_date_from": "diagnosis_date",
        "diagnosis_date_to": "diagnosis_date",
    }
    _required_fields = [
        "animal_id",
        "disease_id",
        "instructor_id",
        "diagnosis_date",
        "status",
    ]

    # Valores de gravedad aceptados (coinciden con el frontend)
    SEVERITY_LEVELS = ("Leve", "Moderada", "Severa", "Crítica")
    # Estados que cierran el caso
    RESOLVED_STATUSES = ("Recuperado", "Tratado", "Curado")

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        data = super()._validate_and_normalize(data, is_update, instance_id)
        errors = []
        from datetime import date as py_date

        if "severity" in data and data["severity"]:
            if data["severity"] not in cls.SEVERITY_LEVELS:
                errors.append(
                    f"La gravedad debe ser una de: {', '.join(cls.SEVERITY_LEVELS)}"
                )
        diagnosis_date = data.get("diagnosis_date")
        recovery_date = data.get("recovery_date")
        if recovery_date and isinstance(recovery_date, py_date):
            if recovery_date > py_date.today():
                errors.append("La fecha de recuperación no puede ser futura")
            if diagnosis_date and recovery_date < diagnosis_date:
                errors.append(
                    "La fecha de recuperación no puede ser anterior al diagnóstico"
                )
        if errors:
            raise ValidationError("; ".join(errors), code="validation_error")
        return data

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if "status" in data and not data["status"]:
            errors.append("El estado no puede estar vacío")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError

            raise ValidationError("; ".join(errors), code="validation_error")

    def __repr__(self):
        return f"<AnimalDisease {self.id}: Animal {self.animal_id} - Disease {self.disease_id}>"
