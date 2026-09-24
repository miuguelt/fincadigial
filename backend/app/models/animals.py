from app import db
import enum
import logging
from datetime import date, timedelta
from sqlalchemy import cast, func, case, String, select
from app.models.base_model import BaseModel, ValidationError
from app.models.electronic_id_mixin import ElectronicIdMixin
from app.services.analytics.cattle_metrics_service import calculate_frame_score

logger = logging.getLogger(__name__)


class Sex(enum.Enum):
    """Enumeración para el sexo de los animales"""

    Hembra = "Hembra"
    Macho = "Macho"

    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]

    def __str__(self):
        """Devuelve el valor como string para facilitar la conversión"""
        return str(self.value)

    def __repr__(self):
        """Representación detallada para debug"""
        return f"{self.__class__.__name__}.{self.name}"


class AnimalStatus(enum.Enum):
    """Enumeración para el estado de los animales"""

    Vivo = "Vivo"
    Vendido = "Vendido"
    Muerto = "Muerto"

    @classmethod
    def get_choices(cls):
        return [(choice.value, choice.value) for choice in cls]

    def __str__(self):
        """Devuelve el valor como string para facilitar la conversión"""
        return str(self.value)

    def __repr__(self):
        """Representación detallada para debug"""
        return f"{self.__class__.__name__}.{self.name}"


import uuid
import string
import random


class Animals(BaseModel, ElectronicIdMixin):
    """Modelo para animales optimizado para namespaces - Multi-tenant"""

    __tablename__ = "animals"
    # Índices de rendimiento: búsquedas frecuentes por (breeds_id,status) y ordenaciones/filtrado recientes
    # Unique constraint compuesto: record debe ser único POR finca (no global)
    __table_args__ = (
        db.Index("ix_animals_breeds_status", "breeds_id", "status"),
        db.Index("ix_animals_created_at", "created_at"),
        db.Index("ix_animals_updated_at", "updated_at"),  # Para ?since= y /metadata
        db.Index("ix_animals_finca_id", "finca_id"),  # Índice para filtrado tenant
        db.Index("ix_animals_finca_status", "finca_id", "status"),  # Acelera filtros y KPIs por estado y finca
        # Índices para la barra de filtros de inventario ("Gestación / Lactancia /
        # Destete / Bajo peso"): ventanas de edad por birth_date, umbral de peso y
        # banderas reproductivas. Los booleans usan índices PARCIALES: solo
        # contienen filas con el flag activo (compactos y el planner los usa
        # directo para `WHERE is_pregnant = true`).
        db.Index("ix_animals_birth_date", "birth_date"),
        db.Index("ix_animals_weight", "weight"),
        db.Index(
            "ix_animals_pregnant_true",
            "id",
            postgresql_where=db.text("is_pregnant IS TRUE"),
        ),
        db.Index(
            "ix_animals_lactating_true",
            "id",
            postgresql_where=db.text("is_lactating IS TRUE"),
        ),
        db.UniqueConstraint("record", "finca_id", name="uq_animals_record_finca"),
    )

    id = db.Column(db.Integer, primary_key=True)
    sex = db.Column(db.Enum(Sex), nullable=False)
    birth_date = db.Column(db.Date, nullable=False)
    weight = db.Column(db.Float, nullable=False)
    record = db.Column(
        db.String(255), nullable=False
    )  # unique=True removido - ahora es compuesto con finca_id
    qr_code = db.Column(
        db.String(100), unique=True, nullable=True
    )  # Para escaneo en corral / NFC
    status = db.Column(db.Enum(AnimalStatus), default=AnimalStatus.Vivo)

    # Campos Regulatorios (ICA/SENA)
    entry_date = db.Column(db.Date, nullable=True, default=date.today)
    purchase_date = db.Column(db.Date, nullable=True)
    sale_date = db.Column(db.Date, nullable=True)
    exit_date = db.Column(db.Date, nullable=True)
    exit_reason = db.Column(db.String(255), nullable=True)

    # Foreign Keys
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    breeds_id = db.Column(db.Integer, db.ForeignKey("breeds.id"), nullable=False)
    idFather = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)
    idMother = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)

    # Genealogía profunda
    idFatherFather = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)
    idFatherMother = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)
    idMotherFather = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)
    idMotherMother = db.Column(db.Integer, db.ForeignKey("animals.id"), nullable=True)

    # Estados Reproductivos
    is_pregnant = db.Column(db.Boolean, default=False)
    is_lactating = db.Column(db.Boolean, default=False)
    last_calving_date = db.Column(db.Date, nullable=True)

    # Configuración específica para namespaces
    _namespace_fields = [
        "id",
        "record",
        "qr_code",
        *ElectronicIdMixin.ELECTRONIC_ID_FIELDS,
        "sex",
        "birth_date",
        "weight",
        "status",
        "finca_id",
        "breeds_id",
        "idFather",
        "idMother",
        "idFatherFather",
        "idFatherMother",
        "idMotherFather",
        "idMotherMother",
        "is_pregnant",
        "is_lactating",
        "last_calving_date",
        "entry_date",
        "purchase_date",
        "sale_date",
        "exit_date",
        "exit_reason",
        # Identidad/estado de verificación (la identidad oficial puede llegar
        # después; mientras tanto se expone el UID QR local).
        "animal_uid",
        "official_code",
        "official_identity_status",
        "identification_due_at",
        "pending_alerts_count",
        "current_field_id",
        "current_field_name",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "breed": {"fields": ["id", "name", "species_id"], "depth": 1},
        "father": {"fields": ["id", "record", "sex"], "depth": 1},
        "mother": {"fields": ["id", "record", "sex"], "depth": 1},
        "treatments": {"fields": ["id", "treatment_date", "medication_id"], "depth": 1},
        "vaccinations": {
            "fields": ["id", "vaccination_date", "vaccine_id"],
            "depth": 1,
        },
        "diseases": {"fields": ["id", "disease_id", "diagnosis_date"], "depth": 1},
        "controls": {"fields": ["id", "checkup_date", "weight", "height"], "depth": 1},
        "images": {"fields": ["id", "filename", "filepath", "is_primary"], "depth": 1},
    }
    _searchable_fields = [
        "record",
        "qr_code",
        "nfc_uid",
        "lf_tag_code",
        "exit_reason",
    ]
    _filterable_fields = [
        "id",
        "sex",
        "status",
        "breeds_id",
        "birth_date",
        "weight",
        "created_at",
        "idFather",
        "idMother",
        "is_pregnant",
        "is_lactating",
        "destetar",
        "bajo_peso",
    ]
    _sortable_fields = [
        "id",
        "record",
        "birth_date",
        "weight",
        "created_at",
        "updated_at",
    ]
    _required_fields = ["sex", "birth_date", "weight", "record", "breeds_id"]
    _unique_fields = ["record"]
    _enum_fields = {"sex": Sex, "status": AnimalStatus}
    # Compatibilidad con claves usadas por frontend / legacy
    _input_aliases = {"father_id": "idFather", "mother_id": "idMother"}
    _field_mapping = {
        "idFather": "father_id",
        "idMother": "mother_id",
        "animals_id": "animal_id",
    }

    # Relaciones optimizadas
    finca = db.relationship("Finca", backref="animals", lazy="selectin")
    breed = db.relationship("Breeds", back_populates="animals", lazy="selectin")
    # OPTIMIZED: Changed from lazy='select' to lazy='joined' to prevent N+1 queries in genealogy
    father = db.relationship(
        "Animals", remote_side=[id], foreign_keys=[idFather], lazy="joined"
    )
    mother = db.relationship(
        "Animals", remote_side=[id], foreign_keys=[idMother], lazy="joined"
    )

    # Relaciones con lazy loading optimizado y cascade delete
    treatments = db.relationship(
        "Treatments",
        back_populates="animals",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    vaccinations = db.relationship(
        "Vaccinations",
        back_populates="animals",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    diseases = db.relationship(
        "AnimalDiseases",
        back_populates="animal",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    controls = db.relationship(
        "Control",
        back_populates="animals",
        lazy="dynamic",
        order_by="desc(Control.checkup_date)",
        cascade="all, delete-orphan",
    )
    genetic_improvements = db.relationship(
        "GeneticImprovements",
        back_populates="animals",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    animal_fields = db.relationship(
        "AnimalFields",
        back_populates="animal",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    images = db.relationship(
        "AnimalImages",
        back_populates="animal",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    alerts = db.relationship(
        "AnimalAlert",
        back_populates="animal",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    alert_configs = db.relationship(
        "AnimalAlertConfig",
        back_populates="animal",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    health_history = db.relationship(
        "AnimalHealthHistory",
        back_populates="animal",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    production_metrics = db.relationship(
        "AnimalProductionMetrics",
        back_populates="animal",
        lazy="dynamic",
        cascade="all, delete-orphan",
    )
    identity = db.relationship(
        "AnimalIdentity",
        back_populates="animal",
        uselist=False,
        lazy="selectin",
        passive_deletes=True,
    )

    @property
    def animal_uid(self):
        """Identificador estable para QR/NFC y futura integración ICA."""
        identity = getattr(self, "identity", None)
        return (identity.official_code if identity and identity.official_code else self.qr_code)

    @property
    def official_code(self):
        identity = getattr(self, "identity", None)
        return identity.official_code if identity else None

    @property
    def official_identity_status(self):
        identity = getattr(self, "identity", None)
        status = getattr(identity, "status", None) if identity else None
        return getattr(status, "value", status)

    @property
    def identification_due_at(self):
        identity = getattr(self, "identity", None)
        return identity.identification_due_at if identity else None

    @classmethod
    def generate_qr_code(cls) -> str:
        """Genera un código QR único para identificación de animales."""
        # Formato: ANIM-{timestamp_short}-{random}
        import time

        timestamp = int(time.time()) % 100000
        random_part = "".join(
            random.choices(string.ascii_uppercase + string.digits, k=4)
        )
        return f"ANIM-{timestamp:05d}-{random_part}"

    @classmethod
    def create(cls, commit=True, **kwargs):
        """Sobreescribe create para disparar la actualización incremental de estadísticas y generar QR."""
        # Auto-generar QR code si no se proporciona
        if "qr_code" not in kwargs or not kwargs.get("qr_code"):
            kwargs["qr_code"] = cls.generate_qr_code()

        instance = super().create(commit=commit, **kwargs)
        # Toda alta de animal debe tener una identidad local auditable, incluso
        # cuando llega por el CRUD legado. La verificación oficial (ICA/SINIGAN)
        # se completa después mediante el flujo de transferencias; las crías
        # reciben además su plazo operativo desde calf_registration.
        try:
            from app.services.animal_transfer_service import AnimalTransferService

            AnimalTransferService.ensure_identity(instance, origin_type="LOCAL")
            if commit:
                db.session.commit()
        except Exception:
            # No ocultar un animal ya creado por un fallo accesorio de identidad;
            # el proceso de reconciliación podrá completar la fila posteriormente.
            db.session.rollback()
            logger.exception("No se pudo crear la identidad local del animal %s", instance.id)
        if instance and instance.finca_id:
            from app.models.livestock_summary import LivestockSummary

            summary = LivestockSummary.get_for_finca(instance.finca_id)
            # Actualización incremental O(1) en lugar de recálculo total O(N)
            summary.handle_animal_event(
                "create", animal_data={"status": instance.status, "sex": instance.sex}
            )
            db.session.commit()
        return instance

    def update(self, commit=True, **kwargs):
        """Sobreescribe update para disparar la actualización incremental si cambian campos clave."""
        trigger_fields = {"status", "sex", "finca_id"}
        should_recalc = any(f in kwargs for f in trigger_fields)

        # Capturar datos viejos para el diferencial
        old_data = {"status": self.status, "sex": self.sex}

        updated_instance = super().update(commit=commit, **kwargs)

        if should_recalc and self.finca_id:
            from app.models.livestock_summary import LivestockSummary

            summary = LivestockSummary.get_for_finca(self.finca_id)
            # Aplicar diferencial incremental
            summary.handle_animal_event(
                "update",
                animal_data={"status": self.status, "sex": self.sex},
                old_data=old_data,
            )
            if commit:
                db.session.commit()
        return updated_instance

    def delete(self, commit=True, hard_delete=False):
        """Sobreescribe para disparar la actualización incremental y limpiar archivos."""
        from app.utils.file_storage import delete_animal_directory, delete_animal_image

        f_id = self.finca_id
        # Capturar datos para el diferencial antes de borrar
        animal_data = {"status": self.status, "sex": self.sex}

        # Capturar rutas de imágenes...
        image_filepaths = []
        try:
            image_filepaths = [img.filepath for img in self.images if img.filepath]
        except Exception:
            pass

        animal_id = self.id
        result = super().delete(commit=commit, hard_delete=hard_delete)

        # Actualización incremental tras borrar
        if f_id:
            try:
                from app.models.livestock_summary import LivestockSummary

                summary = LivestockSummary.get_for_finca(f_id)
                summary.handle_animal_event("delete", animal_data=animal_data)
                if commit:
                    db.session.commit()
            except Exception as e:
                logger.error(f"Error actualizando resumen incremental tras delete: {e}")

        # Archivos físicos: solo en borrado definitivo (el lógico es reversible).
        if not hard_delete:
            return result
        try:
            directory_deleted = delete_animal_directory(animal_id)
            if not directory_deleted:  # fallback: archivo por archivo
                for filepath in image_filepaths:
                    delete_animal_image(filepath)
        except Exception as e:
            logger.warning(f"Error limpiando archivos del animal {animal_id}: {e}")

        return result

    def restore(self, commit=True):
        """Sobreescribe restore para disparar la actualización incremental al restaurar."""
        result = super().restore(commit=commit)
        if self.finca_id:
            try:
                from app.models.livestock_summary import LivestockSummary

                summary = LivestockSummary.get_for_finca(self.finca_id)
                summary.handle_animal_event(
                    "create", animal_data={"status": self.status, "sex": self.sex}
                )
                if commit:
                    db.session.commit()
            except Exception as e:
                logger.error(
                    f"Error actualizando resumen incremental tras restore: {e}"
                )
        return result

    @classmethod
    def bulk_create(cls, items_data):
        instances = super().bulk_create(items_data)
        finca_ids = {inst.finca_id for inst in instances if inst.finca_id}
        if finca_ids:
            from app.models.livestock_summary import LivestockSummary

            for f_id in finca_ids:
                summary = LivestockSummary.get_for_finca(f_id)
                summary.recalculate()
        return instances

    @classmethod
    def bulk_update(cls, updates_data):
        instances = super().bulk_update(updates_data)
        finca_ids = {inst.finca_id for inst in instances if inst.finca_id}
        if finca_ids:
            from app.models.livestock_summary import LivestockSummary

            for f_id in finca_ids:
                summary = LivestockSummary.get_for_finca(f_id)
                summary.recalculate()
        return instances

    @classmethod
    def bulk_delete(cls, ids, hard_delete=False):
        from app.utils.tenant_context import apply_tenant_filter

        instances = apply_tenant_filter(cls.query, cls).filter(cls.id.in_(ids)).all()
        finca_ids = {inst.finca_id for inst in instances if inst.finca_id}

        count = super().bulk_delete(ids, hard_delete=hard_delete)

        if finca_ids:
            from app.models.livestock_summary import LivestockSummary

            for f_id in finca_ids:
                summary = LivestockSummary.get_for_finca(f_id)
                summary.recalculate()
        return count

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        """
        Sobrescribe para añadir validaciones y normalizaciones específicas de Animales.
        """
        # Llamar primero a la validación y normalización base
        data = super()._validate_and_normalize(data, is_update, instance_id)

        # Validar fecha de nacimiento
        if "birth_date" in data and data["birth_date"]:
            b_date = data["birth_date"]
            if isinstance(b_date, str):
                try:
                    b_date = date.fromisoformat(b_date)
                except (ValueError, TypeError):
                    pass
            if isinstance(b_date, date) and b_date > date.today():
                raise ValidationError("La fecha de nacimiento no puede ser futura")

        # Validar fechas ICA
        for date_field in ["entry_date", "purchase_date", "sale_date", "exit_date"]:
            if date_field in data and data[date_field]:
                d_val = data[date_field]
                if isinstance(d_val, str):
                    try:
                        d_val = date.fromisoformat(d_val)
                    except (ValueError, TypeError):
                        pass
                if isinstance(d_val, date) and d_val > date.today():
                    raise ValidationError(
                        f"La fecha de {date_field.replace('_', ' ')} no puede ser futura"
                    )

        # Validar peso (permitir int o float)
        if "weight" in data and data.get("weight") is not None:
            w = data["weight"]
            if not isinstance(w, (int, float)) or w <= 0:
                raise ValidationError("El peso debe ser un número positivo")

        # Validar genealogía
        if (
            data.get("idFather")
            and data.get("idMother")
            and data["idFather"] == data["idMother"]
        ):
            raise ValidationError("El padre y la madre no pueden ser el mismo animal")

        return data

    @property
    def age_in_days(self):
        """Calcula la edad del animal en días."""
        if not self.birth_date:
            return None
        return (date.today() - self.birth_date).days

    @property
    def age_in_months(self):
        """Calcula la edad aproximada del animal en meses."""
        days = self.age_in_days
        return round(days / 30.44) if days is not None else None

    def is_adult(self, adult_age_months=12):
        """Determina si el animal es adulto basado en una edad en meses."""
        months = self.age_in_months
        return months is not None and months >= adult_age_months

    @property
    def pending_alerts_count(self):
        """Devuelve el número de alertas no leídas para este animal."""
        if hasattr(self, "_prefetched_alert_count"):
            return self._prefetched_alert_count
        if hasattr(self, "_prefetched_alerts"):
            return len(self._prefetched_alerts)
        from app.models.alerts import AnimalAlert

        return AnimalAlert.query.filter_by(
            animal_id=self.id,
            is_read=False,
            superseded_by_id=None,
        ).count()

    @property
    def max_pending_priority(self):
        """Devuelve la prioridad más alta de las alertas no leídas."""
        if hasattr(self, "_prefetched_max_priority"):
            return self._prefetched_max_priority
        if hasattr(self, "_prefetched_alerts"):
            if not self._prefetched_alerts:
                return None
            priority_weight = {"Crítica": 4, "Alta": 3, "Media": 2, "Baja": 1}

            def get_weight(alert):
                p = getattr(alert, "priority", None)
                p_val = getattr(p, "value", p) if p else None
                return priority_weight.get(str(p_val), 0)

            sorted_alerts = sorted(
                self._prefetched_alerts, key=get_weight, reverse=True
            )
            highest = sorted_alerts[0]
            p = getattr(highest, "priority", None)
            return getattr(p, "value", p) if p else None

        from app.models.alerts import AnimalAlert

        highest = (
            AnimalAlert.query.filter_by(
                animal_id=self.id,
                is_read=False,
                superseded_by_id=None,
            )
            .order_by(
                db.case(
                    {"Crítica": 0, "Alta": 1, "Media": 2, "Baja": 3},
                    value=AnimalAlert.priority,
                ).asc()
            )
            .first()
        )
        return highest.priority.value if highest else None

    @property
    def last_height(self):
        """Obtiene la última altura registrada en los controles."""
        if hasattr(self, "_prefetched_control"):
            last_control = self._prefetched_control
        else:
            last_control = self.controls.first()
        return last_control.height if last_control else None

    @property
    def frame_score(self):
        """Calcula el Frame Score dinámicamente basado en la última altura y edad actual."""
        height = self.last_height
        age_days = self.age_in_days
        if height and age_days:
            return calculate_frame_score(self.sex.value, height, age_days)
        return None

    # Dependencias de propiedades calculadas para optimización automática de queries
    _property_dependencies = {
        "current_field_id": "animal_fields",
        "current_field_name": "animal_fields",
        "health_indicator": "controls",
        "age_in_days": None,  # No tiene dependencias de relación
        "age_in_months": None,
    }

    @property
    def current_field_id(self):
        """Obtiene el ID del potrero actual donde se encuentra el animal."""
        try:
            if hasattr(self, "_prefetched_active_field"):
                active_assignment = self._prefetched_active_field
            else:
                active_assignment = self.animal_fields.filter_by(
                    removal_date=None, is_deleted=False
                ).first()
            if active_assignment and active_assignment.field_id:
                return active_assignment.field_id
        except Exception:
            pass
        return None

    @property
    def current_field_name(self):
        """Obtiene el nombre del potrero actual donde se encuentra el animal."""
        try:
            if hasattr(self, "_prefetched_active_field"):
                active_assignment = self._prefetched_active_field
            else:
                # Búsqueda optimizada en la relación animal_fields
                active_assignment = self.animal_fields.filter_by(
                    removal_date=None, is_deleted=False
                ).first()
            if active_assignment and active_assignment.field:
                return active_assignment.field.name
        except Exception:
            pass
        return "Sin potrero"

    @property
    def health_indicator(self):
        """
        Semáforo de salud visual basado en reglas deterministas:
        - 'critical' (Rojo): Estado enfermo OR vacunación crítica (> 180 días) OR pérdida peso > 10%
        - 'warning' (Ámbar): Vacunación próxima (< 15 días) OR reproductivo próximo
        - 'stable' (Verde): Todo al día
        """
        from datetime import date, timedelta

        today = date.today()

        # 1. Estado Crítico (Rojo)
        if (
            self.status == AnimalStatus.Muerto
            or str(self.status) == "AnimalStatus.Muerto"
            or str(self.status) == "Muerto"
        ):
            return "critical"

        # Último control de salud
        if hasattr(self, "_prefetched_control"):
            last_control = self._prefetched_control
        else:
            last_control = self.controls.first()

        if last_control:
            hs = getattr(
                last_control.health_status, "value", last_control.health_status
            )
            # El enum HealthStatus de Control no tiene "Enfermo": los estados
            # críticos se expresan como Malo/Regular. Antes el semáforo nunca
            # se encendía en rojo porque comparaba contra "Enfermo".
            if hs in ("Malo", "Regular"):
                return "critical"

        # Vacunación vencida (> 6 meses)
        if hasattr(self, "_prefetched_vacc"):
            last_vacc = self._prefetched_vacc
        else:
            last_vacc = self.vaccinations.order_by(db.desc("vaccination_date")).first()

        if last_vacc and last_vacc.vaccination_date:
            if (today - last_vacc.vaccination_date).days > 180:
                return "critical"

        # 2. Estado de Advertencia (Ámbar)
        # Vacunación próxima (próximos 15 días)
        if last_vacc and last_vacc.next_due_date:
            if 0 <= (last_vacc.next_due_date - today).days <= 15:
                return "warning"

        # Parto próximo (si está preñada y tiene fecha estimada)
        if self.is_pregnant and self.last_calving_date:
            # Gestación bovina desde system_contents
            from app.models.system_content import SystemContent

            gest_entry = SystemContent.get_by_key("param.reproduction.gestation_days")
            gestation_days = (
                int(float(gest_entry.content))
                if (gest_entry and gest_entry.content)
                else 283
            )
            due_date = self.last_calving_date + timedelta(days=gestation_days)
            if 0 <= (due_date - today).days <= 20:
                return "warning"

        return "stable"

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        """
        Añade campos calculados a la serialización del modelo de forma eficiente.
        """
        # Si no hay campos especificados, usamos los por defecto + calculados
        # Si hay campos especificados, solo calculamos los que están en la lista
        is_full = fields is None

        data = super().to_namespace_dict(include_relations, depth, fields)

        # Campos calculados básicos (ligeros) con manejo de errores defensivo
        def _safe_get(prop_name, default=None):
            try:
                val = getattr(self, prop_name)
                # Si es un Enum o tiene .value, intentar extraerlo
                if hasattr(val, "value"):
                    return val.value
                return val
            except Exception as e:
                logger.debug(
                    f"Error accediendo a propiedad {prop_name} en Animal {self.id}: {e}"
                )
                return default

        if is_full or (fields and "age_in_days" in fields):
            data["age_in_days"] = _safe_get("age_in_days")
        if is_full or (fields and "age_in_months" in fields):
            data["age_in_months"] = _safe_get("age_in_months")
        if is_full or (fields and "is_adult" in fields):
            try:
                data["is_adult"] = self.is_adult()
            except Exception:
                data["is_adult"] = None
        if is_full or (fields and "frame_score" in fields):
            data["frame_score"] = _safe_get("frame_score")
        if is_full or (fields and "current_field_id" in fields):
            data["current_field_id"] = _safe_get("current_field_id")
        if is_full or (fields and "current_field_name" in fields):
            data["current_field_name"] = _safe_get("current_field_name", "Sin potrero")
        if is_full or (fields and "health_indicator" in fields):
            data["health_indicator"] = _safe_get("health_indicator", "stable")

        # Campos pesados (con queries)
        if is_full or (fields and "pending_alerts_count" in fields):
            data["pending_alerts_count"] = _safe_get("pending_alerts_count", 0)
        if is_full or (fields and "max_pending_priority" in fields):
            data["max_pending_priority"] = _safe_get("max_pending_priority")

        return data

    @classmethod
    def _apply_smart_filters(cls, query, custom_filters):
        """Filtros de la barra "Filtros inteligentes" del inventario.

        Auditoría (2026-09):
        - is_pregnant / is_lactating: igualdad booleana, usa índices parciales.
        - destetar: ANTES devolvía `birth_date <= today-210`, es decir TODOS los
          animales de 7+ meses (adultos incluidos). Ahora devuelve la ventana real
          de terneros próximos a destetar (7-8 meses, ventana 200-250 días,
          regla KB MAN-001) con un solo rango sobre ix_animals_birth_date.
        - bajo_peso: ANTES `weight < 200` (kg fijos, ignoraba raza y edad).
          Ahora compara contra el estándar por raza/sexo/edad (min_weight_kg de
          breed_growth_standards interpolado) igual que el motor de alertas.
        """
        if "is_pregnant" in custom_filters:
            val = custom_filters["is_pregnant"]
            if str(val).lower() in ("true", "1", "yes"):
                query = query.filter(cls.is_pregnant == True)
            elif str(val).lower() in ("false", "0", "no"):
                query = query.filter(cls.is_pregnant == False)

        if "is_lactating" in custom_filters:
            val = custom_filters["is_lactating"]
            if str(val).lower() in ("true", "1", "yes"):
                query = query.filter(cls.is_lactating == True)
            elif str(val).lower() in ("false", "0", "no"):
                query = query.filter(cls.is_lactating == False)

        if "destetar" in custom_filters and str(custom_filters["destetar"]).lower() in (
            "true",
            "1",
            "yes",
        ):
            # Ventana de destete: 200-250 días de edad (7-8 meses, KB MAN-001).
            today = date.today()
            query = query.filter(
                cls.birth_date >= today - timedelta(days=250),
                cls.birth_date <= today - timedelta(days=200),
            )

        if "bajo_peso" in custom_filters:
            from app.models.breed_growth_standards import BreedGrowthStandard

            # Edad en meses (portable: date-date = int días en PG, julianday en SQLite)
            bind = db.session.get_bind()
            if bind.dialect.name == "postgresql":
                age_days = func.current_date() - cls.birth_date
            else:
                age_days = func.julianday(func.current_date()) - func.julianday(
                    cls.birth_date
                )
            age_months = age_days / 30.44
            sex_str = cast(cls.sex, String)

            bgs = BreedGrowthStandard.__table__
            # Puntos de referencia: inmediato inferior y superior a la edad
            lo = (
                select(bgs.c.min_weight_kg, bgs.c.age_months)
                .where(
                    bgs.c.breed_id == cls.breeds_id,
                    bgs.c.sex == sex_str,
                    bgs.c.age_months <= age_months,
                )
                .order_by(bgs.c.age_months.desc())
                .limit(1)
            )
            hole = (
                select(bgs.c.min_weight_kg, bgs.c.age_months)
                .where(
                    bgs.c.breed_id == cls.breeds_id,
                    bgs.c.sex == sex_str,
                    bgs.c.age_months >= age_months,
                )
                .order_by(bgs.c.age_months.asc())
                .limit(1)
            )
            min_w = case(
                (lo.c.age_months == hole.c.age_months, lo.c.min_weight_kg),
                else_=lo.c.min_weight_kg
                + (hole.c.min_weight_kg - lo.c.min_weight_kg)
                * (
                    (age_months - lo.c.age_months)
                    / func.nullif(hole.c.age_months - lo.c.age_months, 0)
                ),
            )
            query = query.filter(cls.weight > 0, cls.weight < min_w)

        return query

    @classmethod
    def get_namespace_query(
        cls,
        filters=None,
        search=None,
        search_type="auto",
        sort_by=None,
        sort_order="asc",
        page=None,
        per_page=None,
        include_relations=False,
    ):
        custom_filters = {}
        if filters:
            for k in ["is_pregnant", "is_lactating", "destetar", "bajo_peso"]:
                if k in filters:
                    custom_filters[k] = filters.pop(k)

        search_str = str(search).strip() if search else ""

        query = super().get_namespace_query(
            filters,
            None,  # Manejado custom abajo para búsquedas multi-tabla y multi-token
            search_type,
            sort_by,
            sort_order,
            None,
            None,
            include_relations,
        )

        query = cls._apply_smart_filters(query, custom_filters)

        if search_str:
            from app.models.breeds import Breeds
            from app.models.species import Species
            from sqlalchemy import cast as sa_cast, String as sa_String, or_, and_

            query = query.outerjoin(Breeds, cls.breeds_id == Breeds.id).outerjoin(
                Species, Breeds.species_id == Species.id
            )

            tokens = [t.strip() for t in search_str.split() if t.strip()]
            token_conditions = []

            for token in tokens:
                per_token_or = [
                    cls.record.ilike(f"%{token}%"),
                    sa_cast(cls.sex, sa_String).ilike(f"%{token}%"),
                    sa_cast(cls.status, sa_String).ilike(f"%{token}%"),
                    sa_cast(cls.birth_date, sa_String).ilike(f"%{token}%"),
                    Breeds.name.ilike(f"%{token}%"),
                    Species.name.ilike(f"%{token}%"),
                ]
                if hasattr(cls, "qr_code") and cls.qr_code is not None:
                    per_token_or.append(cls.qr_code.ilike(f"%{token}%"))
                if hasattr(cls, "nfc_uid") and cls.nfc_uid is not None:
                    per_token_or.append(cls.nfc_uid.ilike(f"%{token}%"))
                if hasattr(cls, "lf_tag_code") and cls.lf_tag_code is not None:
                    per_token_or.append(cls.lf_tag_code.ilike(f"%{token}%"))
                if hasattr(cls, "exit_reason") and cls.exit_reason is not None:
                    per_token_or.append(cls.exit_reason.ilike(f"%{token}%"))

                clean_num = token.lstrip("#").strip()
                if clean_num.isdigit():
                    try:
                        per_token_or.append(cls.id == int(clean_num))
                    except Exception:
                        pass
                token_conditions.append(or_(*per_token_or))

            if token_conditions:
                query = query.filter(and_(*token_conditions))

        if page and per_page:
            query = query.paginate(page=page, per_page=per_page, error_out=False)

        return query

    @classmethod
    def get_paginated_response(cls, query_result, include_relations=False, depth=1):
        """Serialize animal pages while prefetching only requested computed fields."""
        animals = query_result.items if hasattr(query_result, "items") else query_result

        requested_fields = None
        try:
            from flask import has_request_context, request

            if has_request_context():
                fields_param = request.args.get("fields")
                if fields_param:
                    requested_fields = {
                        field.strip()
                        for field in fields_param.split(",")
                        if field.strip()
                    }
        except Exception:
            requested_fields = None

        needs_all = requested_fields is None
        needs_controls = needs_all or bool(
            {"frame_score", "health_indicator", "last_height"} & requested_fields
        )
        needs_vaccinations = needs_all or "health_indicator" in requested_fields
        needs_active_field = needs_all or bool(
            {"current_field_id", "current_field_name", "current_field"} & requested_fields
        )
        needs_alert_count = needs_all or "pending_alerts_count" in requested_fields
        needs_alert_priority = needs_all or "max_pending_priority" in requested_fields

        # Pre-recuperar datos por lotes (batch) si hay animales
        if animals:
            animal_ids = [a.id for a in animals]

            latest_controls = {}
            latest_vaccs = {}
            active_fields_map = {}
            alert_counts = {}
            alerts_map = {}

            def _latest_related_records(model_class, date_column):
                """Fetch one related row per animal instead of whole histories."""
                ranked = (
                    select(
                        model_class.id.label("related_id"),
                        func.row_number()
                        .over(
                            partition_by=model_class.animal_id,
                            order_by=(date_column.desc(), model_class.id.desc()),
                        )
                        .label("row_number"),
                    )
                    .where(model_class.animal_id.in_(animal_ids))
                    .subquery()
                )
                return (
                    db.session.query(model_class)
                    .join(ranked, model_class.id == ranked.c.related_id)
                    .filter(ranked.c.row_number == 1)
                    .all()
                )

            # 1. Controles de salud más recientes. La consulta anterior traía
            # todo el historial de cada animal de la página y luego descartaba
            # casi todas las filas en Python.
            if needs_controls:
                from app.models.control import Control

                controls = _latest_related_records(Control, Control.checkup_date)

                for c in controls:
                    if c.animal_id not in latest_controls:
                        latest_controls[c.animal_id] = c

            # 2. Vacunaciones más recientes
            if needs_vaccinations:
                from app.models.vaccinations import Vaccinations

                vaccs = _latest_related_records(
                    Vaccinations, Vaccinations.vaccination_date
                )

                for v in vaccs:
                    if v.animal_id not in latest_vaccs:
                        latest_vaccs[v.animal_id] = v

            # 3. Potreros activos (animal_fields)
            if needs_active_field:
                from sqlalchemy.orm import joinedload
                from app.models.animalFields import AnimalFields

                active_fields = (
                    db.session.query(AnimalFields)
                    .options(joinedload(AnimalFields.field))
                    .filter(
                        AnimalFields.animal_id.in_(animal_ids),
                        AnimalFields.removal_date.is_(None),
                        AnimalFields.is_deleted.is_(False),
                    )
                    .all()
                )

                for af in active_fields:
                    if af.field:
                        active_fields_map[af.animal_id] = af

            # 4. Alertas pendientes: count in SQL instead of materializing thousands
            # of alert objects when the UI only requested the counter.
            from app.models.alerts import AnimalAlert

            if needs_alert_count or needs_alert_priority:
                # El listado solo necesita el contador y/o la prioridad máxima;
                # no materializar todas las alertas pendientes en memoria.
                from app.models.alerts import AlertPriority

                priority_weight = db.case(
                    {"Crítica": 4, "Alta": 3, "Media": 2, "Baja": 1},
                    value=AnimalAlert.priority,
                    else_=0,
                )
                alert_rows = (
                    db.session.query(
                        AnimalAlert.animal_id,
                        db.func.count(AnimalAlert.id),
                        db.func.max(priority_weight),
                    )
                    .filter(
                        AnimalAlert.animal_id.in_(animal_ids),
                        AnimalAlert.is_read.is_(False),
                        AnimalAlert.superseded_by_id.is_(None),
                    )
                    .group_by(AnimalAlert.animal_id)
                    .all()
                )
                weight_to_priority = {
                    4: AlertPriority.CRITICAL.value,
                    3: AlertPriority.HIGH.value,
                    2: AlertPriority.MEDIUM.value,
                    1: AlertPriority.LOW.value,
                }
                for animal_id, count, max_weight in alert_rows:
                    alert_counts[animal_id] = int(count or 0)
                    if needs_alert_priority:
                        alerts_map[animal_id] = weight_to_priority.get(max_weight)

            # Asignar los datos pre-recuperados a las instancias como atributos privados
            for a in animals:
                if needs_controls:
                    a._prefetched_control = latest_controls.get(a.id)
                if needs_vaccinations:
                    a._prefetched_vacc = latest_vaccs.get(a.id)
                if needs_active_field:
                    a._prefetched_active_field = active_fields_map.get(a.id)
                if needs_alert_count:
                    a._prefetched_alert_count = alert_counts.get(a.id, 0)
                if needs_alert_priority:
                    a._prefetched_max_priority = alerts_map.get(a.id)

        serialized = [
            animal.to_namespace_dict(
                include_relations=include_relations,
                depth=depth,
                fields=list(requested_fields) if requested_fields is not None else None,
            )
            for animal in animals
        ]

        if hasattr(query_result, "items"):
            return {
                "items": serialized,
                "total_items": query_result.total,
                "limit": query_result.per_page,
                "per_page": query_result.per_page,
                "page": query_result.page,
                "total_pages": query_result.pages,
                "has_next_page": query_result.has_next,
                "has_previous_page": query_result.has_prev,
            }

        return {
            "items": serialized,
            "total_items": len(serialized),
            "limit": len(serialized),
            "per_page": len(serialized),
            "page": 1,
            "total_pages": 1,
            "has_next_page": False,
            "has_previous_page": False,
        }

    def to_ai_context(self, include_relations=True, depth=1):
        """Genera un resumen textual enriquecido del animal para procesamiento por IA."""
        # Obtener el último peso registrado en controles, o el peso inicial
        last_control = self.controls.first()
        current_weight = last_control.weight if last_control else self.weight

        # Obtener enfermedades recientes
        recent_diseases = []
        try:
            recent_diseases = [
                d.disease.name for d in self.diseases.limit(3).all() if d.disease
            ]
        except Exception:
            pass

        # Obtener últimas 3 vacunas
        recent_vaccines = []
        try:
            recent_vaccines = [
                f"{v.vaccine.name} ({v.vaccination_date})"
                for v in self.vaccinations.order_by(db.desc("vaccination_date"))
                .limit(3)
                .all()
                if v.vaccine
            ]
        except Exception:
            pass

        # Obtener últimos 3 tratamientos
        recent_treatments = []
        try:
            recent_treatments = [
                f"{t.description} ({t.treatment_date})"
                for t in self.treatments.order_by(db.desc("treatment_date"))
                .limit(3)
                .all()
            ]
        except Exception:
            pass

        # Obtener potrero actual
        current_field = "Sin potrero"
        try:
            active_af = self.animal_fields.filter_by(
                removal_date=None, is_deleted=False
            ).first()
            if active_af:
                current_field = active_af.field.name
        except Exception:
            pass

        diseases_text = ", ".join(recent_diseases) if recent_diseases else "Ninguna"
        vaccines_text = (
            ", ".join(recent_vaccines) if recent_vaccines else "Sin registros recientes"
        )
        treatments_text = (
            ", ".join(recent_treatments)
            if recent_treatments
            else "Sin registros recientes"
        )

        return f"""ANIMAL ID: {self.id} (Récord: {self.record})
- Raza: {self.breed.name if self.breed else "Desconocida"}
- Sexo: {self.sex.value}
- Edad: {self.age_in_months} meses
- Peso actual: {current_weight} kg
- Estado: {self.status.value}
- Potrero actual: {current_field}
- Historial médico: {diseases_text}
- Últimas vacunas: {vaccines_text}
- Últimos tratamientos: {treatments_text}
"""

    @classmethod
    def batch_weight(
        cls,
        animal_ids,
        weight,
        checkup_date=None,
        health_status="Sano",
        notes=None,
        finca_id=None,
    ):
        """Registra un pesaje masivo para un lote de animales."""
        from app.models.control import Control
        from datetime import date

        if not checkup_date:
            checkup_date = date.today()

        # Validar propiedad de los animales
        if finca_id:
            owned = cls.query.filter(
                cls.id.in_(animal_ids), cls.finca_id == finca_id
            ).all()
        else:
            owned = cls.query.filter(cls.id.in_(animal_ids)).all()

        if not owned:
            return []

        results = []
        for animal in owned:
            control = Control.create(
                animal_id=animal.id,
                weight=weight,
                checkup_date=checkup_date,
                health_status=health_status,
                description=notes,
                finca_id=animal.finca_id or finca_id,
            )
            results.append(control)
        return results

    @classmethod
    def batch_vaccinate(
        cls,
        animal_ids,
        vaccine_id,
        vaccination_date=None,
        dosis=None,
        batch_number=None,
        next_due_date=None,
        notes=None,
        finca_id=None,
        performed_by=None,
    ):
        """Registra una vacunación masiva para un lote de animales."""
        from app.models.vaccinations import Vaccinations
        from datetime import date

        if not vaccination_date:
            vaccination_date = date.today()

        # Validar propiedad de los animales
        if finca_id:
            owned = cls.query.filter(
                cls.id.in_(animal_ids), cls.finca_id == finca_id
            ).all()
        else:
            owned = cls.query.filter(cls.id.in_(animal_ids)).all()

        if not owned:
            return []

        results = []
        for animal in owned:
            vacc = Vaccinations.create(
                animal_id=animal.id,
                vaccine_id=vaccine_id,
                vaccination_date=vaccination_date,
                dosis=dosis,
                batch_number=batch_number,
                next_due_date=next_due_date,
                notes=notes,
                finca_id=animal.finca_id or finca_id,
                performed_by=performed_by,
            )
            results.append(vacc)
        return results

    def __repr__(self):
        return f"<Animal {self.id}: {self.record}>"
