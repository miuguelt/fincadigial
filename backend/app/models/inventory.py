import enum as _enum
from datetime import date
from decimal import Decimal, InvalidOperation

from app import db
from app.models.base_model import BaseModel, ValidationError
from sqlalchemy import Index, Numeric


class ProductType(_enum.Enum):
    Medicamento = "Medicamento"
    Vacuna = "Vacuna"


class MovementType(_enum.Enum):
    Entrada = "Entrada"
    Salida = "Salida"
    Ajuste = "Ajuste"
    Baja = "Baja"


class InventoryLot(BaseModel):
    __tablename__ = "inventory_lots"
    __table_args__ = (
        Index("ix_inventory_lots_medication_id", "medication_id"),
        Index("ix_inventory_lots_vaccine_id", "vaccine_id"),
        Index("ix_inventory_lots_expiry_date", "expiry_date"),
        Index("ix_inventory_lots_finca_id", "finca_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_type = db.Column(db.Enum(ProductType), nullable=False)
    medication_id = db.Column(
        db.Integer, db.ForeignKey("medications.id"), nullable=True
    )
    vaccine_id = db.Column(db.Integer, db.ForeignKey("vaccines.id"), nullable=True)
    lot_number = db.Column(db.String(100), nullable=False)
    # Inventory is measured in the unit printed on the package. It can be a
    # whole dose, but it can also be ml, grams or kg, so integer storage loses
    # real field consumption.
    quantity = db.Column(Numeric(12, 3), nullable=False)
    current_quantity = db.Column(Numeric(12, 3), nullable=False)
    unit = db.Column(db.String(50), nullable=False)
    expiry_date = db.Column(db.Date, nullable=False)
    entry_date = db.Column(db.Date, nullable=False, default=date.today)
    supplier = db.Column(db.String(200), nullable=True)
    unit_cost = db.Column(db.Float, nullable=True)
    min_stock = db.Column(db.Integer, nullable=True, default=5)
    notes = db.Column(db.String(500), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    medication = db.relationship(
        "Medications", foreign_keys=[medication_id], lazy="selectin"
    )
    vaccine = db.relationship("Vaccines", foreign_keys=[vaccine_id], lazy="selectin")
    movements = db.relationship(
        "InventoryMovement", back_populates="lot", lazy="dynamic"
    )

    _namespace_fields = [
        "id",
        "product_type",
        "medication_id",
        "vaccine_id",
        "lot_number",
        "quantity",
        "current_quantity",
        "unit",
        "expiry_date",
        "entry_date",
        "supplier",
        "unit_cost",
        "min_stock",
        "notes",
        "finca_id",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "medication": {"fields": ["id", "name"]},
        "vaccine": {"fields": ["id", "name"]},
    }
    _searchable_fields = ["lot_number", "supplier", "notes"]
    _filterable_fields = [
        "product_type",
        "medication_id",
        "vaccine_id",
        "expiry_date",
        "entry_date",
        "finca_id",
    ]
    _sortable_fields = [
        "id",
        "lot_number",
        "expiry_date",
        "entry_date",
        "current_quantity",
        "created_at",
    ]
    _required_fields = [
        "product_type",
        "lot_number",
        "quantity",
        "current_quantity",
        "unit",
        "expiry_date",
    ]

    # Date normalization is now handled by BaseModel
    _unique_fields = []
    _enum_fields = {"product_type": ProductType}
    _allowed_input_fields = []

    _PRODUCT_FK = {
        ProductType.Medicamento: "medication_id",
        ProductType.Vacuna: "vaccine_id",
    }

    @staticmethod
    def _normalize_quantity(value, field_name):
        if value is None:
            return value
        try:
            normalized = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise ValidationError(
                f"El campo '{field_name}' debe ser numérico",
                code="validation_error",
            ) from exc
        if normalized < 0:
            raise ValidationError(
                f"El campo '{field_name}' no puede ser negativo",
                code="validation_error",
            )
        return normalized.quantize(Decimal("0.001"))

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        """Exige que el lote apunte al producto que declara su product_type.

        Sin esto se podían crear lotes sin FK alguna (product_name quedaba en
        None) o con la FK del tipo contrario (un lote de medicamento apuntando
        a una vacuna).
        """
        normalized = super()._validate_and_normalize(data, is_update, instance_id)

        for field in ("quantity", "current_quantity"):
            if field in normalized:
                normalized[field] = cls._normalize_quantity(normalized[field], field)

        product_type = normalized.get("product_type")
        if product_type is None:
            return normalized

        expected = cls._PRODUCT_FK[product_type]
        wrong = next(fk for fk in cls._PRODUCT_FK.values() if fk != expected)

        errors = []
        if not is_update and not normalized.get(expected):
            errors.append(
                f"'{expected}' es requerido para product_type '{product_type.value}'"
            )
        if normalized.get(wrong):
            errors.append(f"'{wrong}' no aplica a product_type '{product_type.value}'")

        if errors:
            raise ValidationError(
                "; ".join(errors), code="validation_error", errors=errors
            )
        return normalized

    @property
    def is_expired(self):
        return self.expiry_date < date.today()

    @property
    def is_usable(self):
        """Whether the physical stock may be used by an application."""
        return not self.is_expired and self.current_quantity > 0

    @property
    def available_quantity(self):
        """Usable stock; expired stock remains physical until written off."""
        return Decimal("0.000") if self.is_expired else self.current_quantity

    @property
    def days_to_expiry(self):
        return (self.expiry_date - date.today()).days

    @property
    def is_low_stock(self):
        if self.min_stock is None or self.is_expired:
            return False
        return self.available_quantity <= self.min_stock

    @property
    def product_name(self):
        if self.medication:
            return self.medication.name
        if self.vaccine:
            return self.vaccine.name
        return None

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        data = super().to_namespace_dict(
            include_relations=include_relations, depth=depth, fields=fields
        )
        data["is_expired"] = self.is_expired
        data["is_usable"] = self.is_usable
        data["available_quantity"] = float(self.available_quantity)
        data["days_to_expiry"] = self.days_to_expiry
        data["is_low_stock"] = self.is_low_stock
        data["product_name"] = self.product_name
        return data


class InventoryMovement(BaseModel):
    __tablename__ = "inventory_movements"
    __table_args__ = (
        Index("ix_inventory_movements_lot_id", "lot_id"),
        Index("ix_inventory_movements_created_at", "created_at"),
        Index("ix_inventory_movements_finca_id", "finca_id"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    lot_id = db.Column(db.Integer, db.ForeignKey("inventory_lots.id"), nullable=False)
    movement_type = db.Column(db.Enum(MovementType), nullable=False)
    quantity = db.Column(Numeric(12, 3), nullable=False)
    balance_before = db.Column(Numeric(12, 3), nullable=True)
    balance_after = db.Column(Numeric(12, 3), nullable=True)
    reference_type = db.Column(db.String(50), nullable=True)
    reference_id = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.String(500), nullable=True)
    actor_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    lot = db.relationship("InventoryLot", back_populates="movements", lazy="selectin")
    actor = db.relationship("User", foreign_keys=[actor_id], lazy="selectin")

    _namespace_fields = [
        "id",
        "lot_id",
        "movement_type",
        "quantity",
        "balance_before",
        "balance_after",
        "reference_type",
        "reference_id",
        "notes",
        "actor_id",
        "finca_id",
        "created_at",
    ]
    _namespace_relations = {
        "lot": {"fields": ["id", "lot_number", "product_type", "unit"]},
        "actor": {"fields": ["id", "fullname"]},
    }
    _searchable_fields = ["notes", "reference_type"]
    _filterable_fields = [
        "lot_id",
        "movement_type",
        "actor_id",
        "reference_type",
        "finca_id",
        "created_at",
    ]
    _sortable_fields = ["id", "movement_type", "quantity", "created_at"]
    _required_fields = ["lot_id", "movement_type", "quantity"]
    _unique_fields = []
    _enum_fields = {"movement_type": MovementType}
