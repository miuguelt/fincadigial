import enum

from app import db
from app.models.base_model import BaseModel


class CropStatus(enum.Enum):
    PLANNED = "planned"
    ACTIVE = "active"
    HARVESTED = "harvested"
    LOST = "lost"


class CropActivityType(enum.Enum):
    SOWING = "sowing"
    IRRIGATION = "irrigation"
    FERTILIZATION = "fertilization"
    PEST_CONTROL = "pest_control"
    HARVEST = "harvest"
    NOTE = "note"


class WaterSourceType(enum.Enum):
    STREAM = "stream"
    WELL = "well"
    RESERVOIR = "reservoir"
    RAINWATER = "rainwater"
    PUBLIC_SUPPLY = "public_supply"
    OTHER = "other"


class RiskSeverity(enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class MarketOfferType(enum.Enum):
    SALE = "sale"
    PURCHASE = "purchase"
    EXCHANGE = "exchange"


class AssistanceStatus(enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class LearningContentType(enum.Enum):
    TEXT = "text"
    AUDIO = "audio"
    VIDEO = "video"
    PDF = "pdf"
    IMAGE = "image"


class CropPlot(BaseModel):
    """Parcela o lote productivo agricola dentro de una finca."""

    __tablename__ = "crop_plots"
    __table_args__ = (
        db.Index("ix_crop_plots_finca_status", "finca_id", "status"),
        db.Index("ix_crop_plots_crop_name", "crop_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    field_id = db.Column(db.Integer, db.ForeignKey("fields.id"), nullable=True)
    name = db.Column(db.String(160), nullable=False)
    crop_name = db.Column(db.String(160), nullable=False)
    variety = db.Column(db.String(160), nullable=True)
    area = db.Column(db.Float, nullable=True)
    area_unit = db.Column(db.String(40), nullable=True, default="ha")
    sowing_date = db.Column(db.Date, nullable=True)
    expected_harvest_date = db.Column(db.Date, nullable=True)
    harvest_date = db.Column(db.Date, nullable=True)
    status = db.Column(db.Enum(CropStatus), nullable=False, default=CropStatus.PLANNED)
    seed_source = db.Column(db.String(180), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    field = db.relationship("Fields", lazy="selectin")

    _namespace_fields = [
        "id",
        "finca_id",
        "field_id",
        "name",
        "crop_name",
        "variety",
        "area",
        "area_unit",
        "sowing_date",
        "expected_harvest_date",
        "harvest_date",
        "status",
        "seed_source",
        "notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {"field": {"fields": ["id", "name"]}}
    _searchable_fields = ["name", "crop_name", "variety", "seed_source", "notes"]
    _filterable_fields = ["finca_id", "field_id", "crop_name", "status", "sowing_date"]
    _sortable_fields = [
        "id",
        "name",
        "crop_name",
        "sowing_date",
        "expected_harvest_date",
        "created_at",
    ]
    _required_fields = ["name", "crop_name"]
    _enum_fields = {"status": CropStatus}


class CropActivity(BaseModel):
    """Bitacora offline de labores, plagas, cosecha y observaciones de cultivos."""

    __tablename__ = "crop_activities"
    __table_args__ = (
        db.Index("ix_crop_activities_plot_date", "crop_plot_id", "activity_date"),
        db.Index("ix_crop_activities_finca_type", "finca_id", "activity_type"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    crop_plot_id = db.Column(db.Integer, db.ForeignKey("crop_plots.id"), nullable=False)
    activity_type = db.Column(db.Enum(CropActivityType), nullable=False)
    activity_date = db.Column(db.Date, nullable=False)
    description = db.Column(db.Text, nullable=True)
    input_name = db.Column(db.String(180), nullable=True)
    quantity = db.Column(db.Float, nullable=True)
    unit = db.Column(db.String(50), nullable=True)
    cost = db.Column(db.Float, nullable=True)
    performed_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    attachment_blob_id = db.Column(
        db.Integer, db.ForeignKey("attachment_blobs.id"), nullable=True
    )
    notes = db.Column(db.Text, nullable=True)

    crop_plot = db.relationship(
        "CropPlot", backref=db.backref("activities", lazy="dynamic"), lazy="selectin"
    )
    actor = db.relationship("User", foreign_keys=[performed_by], lazy="selectin")

    _namespace_fields = [
        "id",
        "finca_id",
        "crop_plot_id",
        "activity_type",
        "activity_date",
        "description",
        "input_name",
        "quantity",
        "unit",
        "cost",
        "performed_by",
        "attachment_blob_id",
        "notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "crop_plot": {"fields": ["id", "name", "crop_name"]},
        "actor": {"fields": ["id", "fullname"]},
    }
    _searchable_fields = ["description", "input_name", "notes"]
    _filterable_fields = [
        "finca_id",
        "crop_plot_id",
        "activity_type",
        "activity_date",
        "performed_by",
    ]
    _sortable_fields = ["id", "activity_date", "activity_type", "created_at"]
    _required_fields = ["crop_plot_id", "activity_type", "activity_date"]
    _enum_fields = {"activity_type": CropActivityType}

    @classmethod
    def create(cls, **kwargs):
        instance = super().create(**kwargs)
        if instance and instance.cost and float(instance.cost) > 0:
            from app.models.financial import (
                Transaction,
                TransactionType,
                TransactionCategory,
            )

            try:
                # Tratar de obtener el nombre de la parcela para la descripción
                from app.models.campesino import CropPlot

                plot = CropPlot.query.get(instance.crop_plot_id)
                plot_name = plot.name if plot else str(instance.crop_plot_id)

                desc = f"Labor de cultivo ({instance.activity_type.value}) - Lote: {plot_name}"
                if instance.input_name:
                    desc += f" | Insumo: {instance.input_name}"

                # A crop cost is farm input spending, not a veterinary service.
                cat = TransactionCategory.Agriculture

                Transaction.create(
                    finca_id=instance.finca_id,
                    transaction_type=TransactionType.Expense,
                    category=cat,
                    amount=instance.cost,
                    date=instance.activity_date,
                    description=desc,
                    created_by_user=instance.performed_by,
                )
            except Exception as e:
                import logging

                logging.getLogger(__name__).error(
                    f"Error creating transaction for CropActivity {instance.id}: {e}"
                )
        return instance

    def update(self, commit=True, **kwargs):
        """Sobreescribe update para sincronizar la transacción financiera asociada si cambian valores clave."""
        old_cost = self.cost
        old_type = self.activity_type
        old_date = self.activity_date
        old_finca = self.finca_id

        result = super().update(commit=False, **kwargs)

        if (
            old_cost != self.cost
            or old_type != self.activity_type
            or old_date != self.activity_date
            or old_finca != self.finca_id
        ):
            from app.models.financial import (
                Transaction,
                TransactionType,
                TransactionCategory,
            )

            desc_prefix_old = f"Labor de cultivo ({old_type.value})"

            # Buscar la transacción vieja
            tx = Transaction.query.filter(
                Transaction.finca_id == old_finca,
                Transaction.date == old_date,
                Transaction.amount == old_cost,
                Transaction.description.like(f"{desc_prefix_old}%"),
                Transaction.is_deleted == False,
            ).first()

            if tx:
                if not self.cost or float(self.cost) <= 0:
                    tx.delete(commit=False)
                else:
                    from app.models.campesino import CropPlot

                    plot = CropPlot.query.get(self.crop_plot_id)
                    plot_name = plot.name if plot else str(self.crop_plot_id)
                    desc = f"Labor de cultivo ({self.activity_type.value}) - Lote: {plot_name}"
                    if self.input_name:
                        desc += f" | Insumo: {self.input_name}"

                    cat = TransactionCategory.Agriculture
                    tx.update(
                        commit=False,
                        finca_id=self.finca_id,
                        amount=self.cost,
                        date=self.activity_date,
                        description=desc,
                        category=cat,
                    )
            elif self.cost and float(self.cost) > 0:
                # Si no existía pero ahora sí tiene costo positivo, crearla
                from app.models.campesino import CropPlot

                plot = CropPlot.query.get(self.crop_plot_id)
                plot_name = plot.name if plot else str(self.crop_plot_id)
                desc = (
                    f"Labor de cultivo ({self.activity_type.value}) - Lote: {plot_name}"
                )
                if self.input_name:
                    desc += f" | Insumo: {self.input_name}"
                cat = TransactionCategory.Agriculture
                Transaction.create(
                    commit=False,
                    finca_id=self.finca_id,
                    transaction_type=TransactionType.Expense,
                    category=cat,
                    amount=self.cost,
                    date=self.activity_date,
                    description=desc,
                    created_by_user=self.performed_by,
                )

        if commit:
            db.session.commit()
        return result

    def delete(self, commit=True, hard_delete=False):
        """Sobreescribe delete para soft-deletar la transacción asociada."""
        if self.cost and float(self.cost) > 0:
            from app.models.financial import Transaction

            desc_prefix = f"Labor de cultivo ({self.activity_type.value})"
            tx = Transaction.query.filter(
                Transaction.finca_id == self.finca_id,
                Transaction.date == self.activity_date,
                Transaction.amount == self.cost,
                Transaction.description.like(f"{desc_prefix}%"),
                Transaction.is_deleted == False,
            ).first()
            if tx:
                tx.delete(commit=commit)
        return super().delete(commit=commit, hard_delete=hard_delete)

    def restore(self, commit=True):
        """Sobreescribe restore para restaurar o recrear la transacción asociada."""
        result = super().restore(commit=commit)
        if self.cost and float(self.cost) > 0:
            from app.models.financial import (
                Transaction,
                TransactionType,
                TransactionCategory,
            )

            desc_prefix = f"Labor de cultivo ({self.activity_type.value})"
            tx = Transaction.query.filter(
                Transaction.finca_id == self.finca_id,
                Transaction.date == self.activity_date,
                Transaction.amount == self.cost,
                Transaction.description.like(f"{desc_prefix}%"),
                Transaction.is_deleted == True,
            ).first()
            if tx:
                tx.restore(commit=commit)
            else:
                from app.models.campesino import CropPlot

                plot = CropPlot.query.get(self.crop_plot_id)
                plot_name = plot.name if plot else str(self.crop_plot_id)
                desc = (
                    f"Labor de cultivo ({self.activity_type.value}) - Lote: {plot_name}"
                )
                if self.input_name:
                    desc += f" | Insumo: {self.input_name}"
                cat = TransactionCategory.Agriculture
                Transaction.create(
                    commit=commit,
                    finca_id=self.finca_id,
                    transaction_type=TransactionType.Expense,
                    category=cat,
                    amount=self.cost,
                    date=self.activity_date,
                    description=desc,
                    created_by_user=self.performed_by,
                )
        return result


class WaterSource(BaseModel):
    """Fuente de agua usada por la finca o comunidad."""

    __tablename__ = "water_sources"
    __table_args__ = (
        db.Index("ix_water_sources_finca_type", "finca_id", "source_type"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    territory_id = db.Column(db.Integer, db.ForeignKey("territories.id"), nullable=True)
    name = db.Column(db.String(160), nullable=False)
    source_type = db.Column(
        db.Enum(WaterSourceType), nullable=False, default=WaterSourceType.OTHER
    )
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    capacity_liters = db.Column(db.Float, nullable=True)
    is_potable = db.Column(db.Boolean, nullable=True)
    reliability = db.Column(db.String(60), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    territory = db.relationship("Territory", lazy="selectin")

    _namespace_fields = [
        "id",
        "finca_id",
        "territory_id",
        "name",
        "source_type",
        "latitude",
        "longitude",
        "capacity_liters",
        "is_potable",
        "reliability",
        "notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "territory": {"fields": ["id", "name", "vereda", "municipality"]}
    }
    _searchable_fields = ["name", "reliability", "notes"]
    _filterable_fields = ["finca_id", "territory_id", "source_type", "is_potable"]
    _sortable_fields = ["id", "name", "source_type", "created_at"]
    _required_fields = ["name"]
    _enum_fields = {"source_type": WaterSourceType}


class WaterMeasurement(BaseModel):
    """Medicion simple y offline de nivel/calidad de una fuente de agua."""

    __tablename__ = "water_measurements"
    __table_args__ = (
        db.Index("ix_water_measurements_source_date", "water_source_id", "measured_at"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id"), nullable=False, index=True
    )
    water_source_id = db.Column(
        db.Integer, db.ForeignKey("water_sources.id"), nullable=False
    )
    measured_at = db.Column(db.DateTime, nullable=False)
    level_percent = db.Column(db.Float, nullable=True)
    flow_liters_minute = db.Column(db.Float, nullable=True)
    ph = db.Column(db.Float, nullable=True)
    turbidity = db.Column(db.Float, nullable=True)
    rainfall_mm = db.Column(db.Float, nullable=True)
    measured_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    notes = db.Column(db.Text, nullable=True)

    water_source = db.relationship(
        "WaterSource",
        backref=db.backref("measurements", lazy="dynamic"),
        lazy="selectin",
    )
    actor = db.relationship("User", foreign_keys=[measured_by], lazy="selectin")

    _namespace_fields = [
        "id",
        "finca_id",
        "water_source_id",
        "measured_at",
        "level_percent",
        "flow_liters_minute",
        "ph",
        "turbidity",
        "rainfall_mm",
        "measured_by",
        "notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "water_source": {"fields": ["id", "name", "source_type"]},
        "actor": {"fields": ["id", "fullname"]},
    }
    _searchable_fields = ["notes"]
    _filterable_fields = ["finca_id", "water_source_id", "measured_at", "measured_by"]
    _sortable_fields = ["id", "measured_at", "created_at"]
    _required_fields = ["water_source_id", "measured_at"]


class ClimateRiskAlert(BaseModel):
    """Alerta local de clima/riesgo compartible entre nodos."""

    __tablename__ = "climate_risk_alerts"
    __table_args__ = (
        db.Index("ix_climate_risk_alerts_finca_severity", "finca_id", "severity"),
        db.Index("ix_climate_risk_alerts_valid_until", "valid_until"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=True)
    territory_id = db.Column(db.Integer, db.ForeignKey("territories.id"), nullable=True)
    title = db.Column(db.String(180), nullable=False)
    risk_type = db.Column(db.String(100), nullable=False)
    severity = db.Column(
        db.Enum(RiskSeverity), nullable=False, default=RiskSeverity.MEDIUM
    )
    description = db.Column(db.Text, nullable=True)
    recommendation = db.Column(db.Text, nullable=True)
    valid_from = db.Column(db.DateTime, nullable=True)
    valid_until = db.Column(db.DateTime, nullable=True)
    source = db.Column(db.String(180), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    territory = db.relationship("Territory", lazy="selectin")

    _namespace_fields = [
        "id",
        "finca_id",
        "territory_id",
        "title",
        "risk_type",
        "severity",
        "description",
        "recommendation",
        "valid_from",
        "valid_until",
        "source",
        "is_active",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "territory": {"fields": ["id", "name", "vereda", "municipality"]}
    }
    _searchable_fields = [
        "title",
        "risk_type",
        "description",
        "recommendation",
        "source",
    ]
    _filterable_fields = [
        "finca_id",
        "territory_id",
        "risk_type",
        "severity",
        "is_active",
    ]
    _sortable_fields = ["id", "severity", "valid_until", "created_at"]
    _required_fields = ["title", "risk_type"]
    _enum_fields = {"severity": RiskSeverity}


class MarketOffer(BaseModel):
    """Oferta campesina local para venta, compra o trueque."""

    __tablename__ = "market_offers"
    __table_args__ = (
        db.Index("ix_market_offers_finca_status", "finca_id", "status"),
        db.Index("ix_market_offers_product", "product_name"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    territory_id = db.Column(db.Integer, db.ForeignKey("territories.id"), nullable=True)
    offer_type = db.Column(
        db.Enum(MarketOfferType), nullable=False, default=MarketOfferType.SALE
    )
    product_name = db.Column(db.String(180), nullable=False)
    quantity = db.Column(db.Float, nullable=True)
    unit = db.Column(db.String(50), nullable=True)
    price = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String(20), nullable=True, default="COP")
    available_from = db.Column(db.Date, nullable=True)
    available_until = db.Column(db.Date, nullable=True)
    contact_name = db.Column(db.String(160), nullable=True)
    contact_phone = db.Column(db.String(80), nullable=True)
    delivery_location = db.Column(db.String(240), nullable=True)
    status = db.Column(db.String(50), nullable=False, default="active")
    notes = db.Column(db.Text, nullable=True)

    territory = db.relationship("Territory", lazy="selectin")

    _namespace_fields = [
        "id",
        "finca_id",
        "territory_id",
        "offer_type",
        "product_name",
        "quantity",
        "unit",
        "price",
        "currency",
        "available_from",
        "available_until",
        "contact_name",
        "contact_phone",
        "delivery_location",
        "status",
        "notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "territory": {"fields": ["id", "name", "vereda", "municipality"]}
    }
    _searchable_fields = ["product_name", "contact_name", "delivery_location", "notes"]
    _filterable_fields = [
        "finca_id",
        "territory_id",
        "offer_type",
        "product_name",
        "status",
    ]
    _sortable_fields = ["id", "product_name", "price", "available_until", "created_at"]
    _required_fields = ["offer_type", "product_name"]
    _enum_fields = {"offer_type": MarketOfferType}


class TechnicalAssistanceRequest(BaseModel):
    """Solicitud de asistencia tecnica o comunitaria, usable offline."""

    __tablename__ = "technical_assistance_requests"
    __table_args__ = (
        db.Index("ix_assistance_finca_status", "finca_id", "status"),
        db.Index("ix_assistance_territory_category", "territory_id", "category"),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    territory_id = db.Column(db.Integer, db.ForeignKey("territories.id"), nullable=True)
    requester_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    assigned_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    title = db.Column(db.String(180), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(50), nullable=False, default="medium")
    status = db.Column(
        db.Enum(AssistanceStatus), nullable=False, default=AssistanceStatus.OPEN
    )
    requested_at = db.Column(db.DateTime, nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolution_notes = db.Column(db.Text, nullable=True)

    territory = db.relationship("Territory", lazy="selectin")
    requester = db.relationship(
        "User", foreign_keys=[requester_user_id], lazy="selectin"
    )
    assignee = db.relationship("User", foreign_keys=[assigned_user_id], lazy="selectin")

    _namespace_fields = [
        "id",
        "finca_id",
        "territory_id",
        "requester_user_id",
        "assigned_user_id",
        "title",
        "category",
        "description",
        "priority",
        "status",
        "requested_at",
        "resolved_at",
        "resolution_notes",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "territory": {"fields": ["id", "name", "vereda", "municipality"]},
        "requester": {"fields": ["id", "fullname"]},
        "assignee": {"fields": ["id", "fullname"]},
    }
    _searchable_fields = ["title", "category", "description", "resolution_notes"]
    _filterable_fields = ["finca_id", "territory_id", "category", "priority", "status"]
    _sortable_fields = ["id", "priority", "status", "requested_at", "created_at"]
    _required_fields = ["title", "category"]
    _enum_fields = {"status": AssistanceStatus}


class OfflineLearningMaterial(BaseModel):
    """Material de aprendizaje descargable para consulta sin conexion."""

    __tablename__ = "offline_learning_materials"
    __table_args__ = (
        db.Index("ix_learning_territory_category", "territory_id", "category"),
        db.Index("ix_learning_is_active", "is_active"),
    )

    id = db.Column(db.Integer, primary_key=True)
    territory_id = db.Column(db.Integer, db.ForeignKey("territories.id"), nullable=True)
    title = db.Column(db.String(180), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    content_type = db.Column(
        db.Enum(LearningContentType), nullable=False, default=LearningContentType.TEXT
    )
    summary = db.Column(db.Text, nullable=True)
    local_uri = db.Column(db.String(500), nullable=True)
    attachment_blob_id = db.Column(
        db.Integer, db.ForeignKey("attachment_blobs.id"), nullable=True
    )
    language = db.Column(db.String(50), nullable=True, default="es")
    reading_level = db.Column(db.String(80), nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    territory = db.relationship("Territory", lazy="selectin")

    _namespace_fields = [
        "id",
        "territory_id",
        "title",
        "category",
        "content_type",
        "summary",
        "local_uri",
        "attachment_blob_id",
        "language",
        "reading_level",
        "is_active",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "territory": {"fields": ["id", "name", "vereda", "municipality"]}
    }
    _searchable_fields = ["title", "category", "summary", "reading_level"]
    _filterable_fields = [
        "territory_id",
        "category",
        "content_type",
        "language",
        "is_active",
    ]
    _sortable_fields = ["id", "title", "category", "created_at"]
    _required_fields = ["title", "category"]
    _enum_fields = {"content_type": LearningContentType}
