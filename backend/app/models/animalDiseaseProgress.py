from datetime import date as py_date

from app import db
from app.models.base_model import BaseModel, ValidationError


class AnimalDiseaseProgress(BaseModel):
    """Avance diario de un episodio de enfermedad.

    Registra el seguimiento clínico de un caso: peso, temperatura, estado
    observado y notas del responsable en cada control. La serie de avances es
    la fuente de datos para los gráficos de evolución del animal.
    """

    __tablename__ = "animal_disease_progress"
    __table_args__ = (
        db.Index(
            "ix_animal_disease_progress_episode_date",
            "animal_disease_id",
            "progress_date",
        ),
        db.Index("ix_animal_disease_progress_finca_id", "finca_id"),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    animal_disease_id = db.Column(
        db.Integer,
        db.ForeignKey("animal_diseases.id", ondelete="CASCADE"),
        nullable=False,
    )
    progress_date = db.Column(db.Date, nullable=False)
    weight = db.Column(db.Float, nullable=True)
    temperature = db.Column(db.Float, nullable=True)
    # Fotografía del estado del episodio en esta fecha (sin tocarlo en el padre)
    status = db.Column(db.String(50), nullable=True)
    observation = db.Column(db.Text, nullable=True)
    performed_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    # Relaciones
    episode = db.relationship(
        "AnimalDiseases", back_populates="progress", lazy="selectin"
    )
    performer = db.relationship(
        "User", foreign_keys=[performed_by], lazy="selectin"
    )

    # Campos / relaciones para namespaces
    _namespace_fields = [
        "id",
        "animal_disease_id",
        "progress_date",
        "weight",
        "temperature",
        "status",
        "observation",
        "performed_by",
        "finca_id",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "episode": {"fields": ["id", "animal_id", "disease_id", "status"], "depth": 1},
        "performer": {"fields": ["id", "fullname", "role"], "depth": 1},
    }
    _searchable_fields = ["observation", "status"]
    _filterable_fields = [
        "animal_disease_id",
        "finca_id",
        "status",
        "progress_date",
        "performed_by",
    ]
    _sortable_fields = ["id", "progress_date", "created_at"]
    _required_fields = ["animal_disease_id", "progress_date"]

    _is_sick_statuses = ("Activo", "En tratamiento", "En Tratamiento", "Observación")
    _resolved_statuses = ("Recuperado", "Tratado", "Curado")

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        data = super()._validate_and_normalize(data, is_update, instance_id)
        errors = []

        progress_date = data.get("progress_date")
        if progress_date and isinstance(progress_date, py_date):
            if progress_date > py_date.today():
                errors.append("La fecha del avance no puede ser futura")

        for field in ("weight", "temperature"):
            value = data.get(field)
            if value is not None:
                try:
                    numeric = float(value)
                except (TypeError, ValueError):
                    errors.append(f"'{field}' debe ser un número")
                    continue
                if numeric <= 0:
                    errors.append(f"'{field}' debe ser un número positivo")

        if errors:
            raise ValidationError("; ".join(errors), code="validation_error")
        return data

    @classmethod
    def create(cls, commit=True, **kwargs):
        """Crea el avance y sincroniza el estado del episodio cuando procede."""
        instance = super().create(commit=False, **kwargs)
        try:
            cls._sync_episode_state(instance)
            instance._mirror_to_health_history()
            if commit:
                db.session.commit()
                db.session.refresh(instance)
        except Exception:
            db.session.rollback()
            raise
        return instance

    def update(self, commit=True, **kwargs):
        updated = super().update(commit=False, **kwargs)
        try:
            self._sync_episode_state(self)
            self._mirror_to_health_history()
            if commit:
                db.session.commit()
                db.session.refresh(self)
        except Exception:
            db.session.rollback()
            raise
        return updated

    def delete(self, commit=True, hard_delete=False):
        """Elimina el avance y su espejo en la bitácora unificada."""
        self._remove_health_history_mirror()
        return super().delete(commit=commit, hard_delete=hard_delete)

    @classmethod
    def _sync_episode_state(cls, instance):
        """Releva estado/fecha de recuperación al episodio según el avance."""
        if not instance or not instance.animal_disease_id:
            return
        from app.models.animalDiseases import AnimalDiseases

        episode = AnimalDiseases.query.get(instance.animal_disease_id)
        if not episode:
            return
        status = instance.status
        changed = False
        if status:
            if status in cls._resolved_statuses:
                if episode.status not in cls._resolved_statuses:
                    episode.status = status
                    changed = True
                if not episode.recovery_date:
                    episode.recovery_date = instance.progress_date
                    changed = True
            elif status not in episode.status and status in cls._is_sick_statuses:
                episode.status = status
                changed = True
        if changed:
            from app.utils.cache_helpers import _cache_clear, _detail_cache_clear

            _cache_clear("AnimalDiseases")
            _detail_cache_clear("AnimalDiseases", episode.id)

    def _mirror_to_health_history(self):
        """Espeja el avance en la bitácora unificada del animal.

        ``animal_health_history`` es el origen del historial clínico en
        formato unificado; sin este espejo los avances del seguimiento no
        aparecen en la línea de tiempo del animal (bitácora) ni en los
        reportes que consumen ese modelo.
        """
        from app.models.animal_health_history import HealthEventType
        from app.models.animalDiseases import AnimalDiseases
        from app.services.health_history_timeline import upsert_event

        if not self.animal_disease_id:
            return
        episode = AnimalDiseases.query.get(self.animal_disease_id)
        if not episode:
            return

        description = self.observation
        if description and episode.disease is not None:
            description = f"Avance de {episode.disease.name}: {description}"
        elif description is None and episode.disease is not None:
            description = f"Avance de {episode.disease.name}"

        upsert_event(
            event_type=HealthEventType.Disease,
            reference_kind="animal_disease_progress",
            reference_id=self.id,
            animal_id=episode.animal_id,
            finca_id=self.finca_id,
            event_date=self.progress_date,
            weight=self.weight,
            temperature=self.temperature,
            health_status=self.status,
            description=description,
            performed_by=self.performed_by,
        )

    def _remove_health_history_mirror(self):
        """Retira el espejo de la bitácora (el avance dejó de existir)."""
        from app.models.animal_health_history import HealthEventType
        from app.services.health_history_timeline import drop_event

        drop_event(
            HealthEventType.Disease,
            "animal_disease_progress",
            self.id,
        )

    def __repr__(self):
        return (
            f"<AnimalDiseaseProgress {self.id}: Episode "
            f"{self.animal_disease_id} - {self.progress_date}>"
        )
