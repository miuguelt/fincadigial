from app import db
import enum
import logging
from datetime import date
from app.models.base_model import BaseModel, ValidationError
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


class Animals(BaseModel):
    """Modelo para animales optimizado para namespaces - Multi-tenant"""

    __tablename__ = "animals"
    # Índices de rendimiento: búsquedas frecuentes por (breeds_id,status) y ordenaciones/filtrado recientes
    # Unique constraint compuesto: record debe ser único POR finca (no global)
    __table_args__ = (
        db.Index("ix_animals_breeds_status", "breeds_id", "status"),
        db.Index("ix_animals_created_at", "created_at"),
        db.Index("ix_animals_updated_at", "updated_at"),  # Para ?since= y /metadata
        db.Index("ix_animals_finca_id", "finca_id"),  # Índice para filtrado tenant
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
        "pending_alerts_count",
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
    _searchable_fields = ["record"]
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

        # Limpieza de archivos físicos (fuera de la transacción de BD)
        try:
            # Intentar eliminar el directorio completo primero
            directory_deleted = delete_animal_directory(animal_id)
            if not directory_deleted:
                # Fallback: eliminar archivo por archivo
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
        # Validar fecha de nacimiento (la normalización str -> date ya la hizo BaseModel)
        if "birth_date" in data and data["birth_date"]:
            if data["birth_date"] > date.today():
                raise ValidationError("La fecha de nacimiento no puede ser futura")

        # Validar fechas ICA
        for date_field in ["entry_date", "purchase_date", "sale_date", "exit_date"]:
            if date_field in data and data[date_field]:
                if data[date_field] > date.today():
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

        # Llamar a la validación base para requeridos, únicos y enums
        return super()._validate_and_normalize(data, is_update, instance_id)

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
        "current_field_name": "animal_fields",
        "health_indicator": "controls",
        "age_in_days": None,  # No tiene dependencias de relación
        "age_in_months": None,
    }

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
            if hs == "Enfermo":
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
        if is_full or (fields and "current_field_name" in fields):
            data["current_field_name"] = _safe_get("current_field_name", "Error")
        if is_full or (fields and "health_indicator" in fields):
            data["health_indicator"] = _safe_get("health_indicator", "stable")

        # Campos pesados (con queries)
        if is_full or (fields and "pending_alerts_count" in fields):
            data["pending_alerts_count"] = _safe_get("pending_alerts_count", 0)
        if is_full or (fields and "max_pending_priority" in fields):
            data["max_pending_priority"] = _safe_get("max_pending_priority")

        return data

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

        query = super().get_namespace_query(
            filters,
            search,
            search_type,
            sort_by,
            sort_order,
            None,
            None,
            include_relations,
        )

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
            from datetime import date, timedelta

            destete_date = date.today() - timedelta(days=210)
            query = query.filter(cls.birth_date <= destete_date)

        if "bajo_peso" in custom_filters:
            query = query.filter(cls.weight < 200)

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
        needs_active_field = needs_all or "current_field_name" in requested_fields
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

            # 1. Controles de salud más recientes
            if needs_controls:
                from app.models.control import Control

                controls = (
                    db.session.query(Control)
                    .filter(Control.animal_id.in_(animal_ids))
                    .order_by(Control.animal_id, Control.checkup_date.desc())
                    .all()
                )

                for c in controls:
                    if c.animal_id not in latest_controls:
                        latest_controls[c.animal_id] = c

            # 2. Vacunaciones más recientes
            if needs_vaccinations:
                from app.models.vaccinations import Vaccinations

                vaccs = (
                    db.session.query(Vaccinations)
                    .filter(Vaccinations.animal_id.in_(animal_ids))
                    .order_by(
                        Vaccinations.animal_id, Vaccinations.vaccination_date.desc()
                    )
                    .all()
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

            if needs_alert_priority:
                unread_alerts = (
                    db.session.query(AnimalAlert)
                    .filter(
                        AnimalAlert.animal_id.in_(animal_ids),
                        AnimalAlert.is_read.is_(False),
                        AnimalAlert.superseded_by_id.is_(None),
                    )
                    .all()
                )
                for alert in unread_alerts:
                    alerts_map.setdefault(alert.animal_id, []).append(alert)
                    alert_counts[alert.animal_id] = (
                        alert_counts.get(alert.animal_id, 0) + 1
                    )
            elif needs_alert_count:
                count_rows = (
                    db.session.query(
                        AnimalAlert.animal_id, db.func.count(AnimalAlert.id)
                    )
                    .filter(
                        AnimalAlert.animal_id.in_(animal_ids),
                        AnimalAlert.is_read.is_(False),
                        AnimalAlert.superseded_by_id.is_(None),
                    )
                    .group_by(AnimalAlert.animal_id)
                    .all()
                )
                alert_counts = {animal_id: count for animal_id, count in count_rows}

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
                    a._prefetched_alerts = alerts_map.get(a.id, [])

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
            animal_ids = [a.id for a in owned]
            if not animal_ids:
                return []

        results = []
        for aid in animal_ids:
            control = Control.create(
                animal_id=aid,
                weight=weight,
                checkup_date=checkup_date,
                health_status=health_status,
                description=notes,
                finca_id=finca_id,
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
            animal_ids = [a.id for a in owned]
            if not animal_ids:
                return []

        results = []
        for aid in animal_ids:
            vacc = Vaccinations.create(
                animal_id=aid,
                vaccine_id=vaccine_id,
                vaccination_date=vaccination_date,
                dosis=dosis,
                batch_number=batch_number,
                next_due_date=next_due_date,
                notes=notes,
                finca_id=finca_id,
                performed_by=performed_by,
            )
            results.append(vacc)
        return results

    def __repr__(self):
        return f"<Animal {self.id}: {self.record}>"
