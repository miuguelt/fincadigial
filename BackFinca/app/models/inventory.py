import enum as _enum
from datetime import date
from app import db
from app.models.base_model import BaseModel
from sqlalchemy import Index


class ProductType(_enum.Enum):
    Medicamento = "Medicamento"
    Vacuna = "Vacuna"


class MovementType(_enum.Enum):
    Entrada = "Entrada"
    Salida = "Salida"
    Ajuste = "Ajuste"
    Baja = "Baja"


class InventoryLot(BaseModel):
    __tablename__ = 'inventory_lots'
    __table_args__ = (
        Index('ix_inventory_lots_medication_id', 'medication_id'),
        Index('ix_inventory_lots_vaccine_id', 'vaccine_id'),
        Index('ix_inventory_lots_expiry_date', 'expiry_date'),
        Index('ix_inventory_lots_finca_id', 'finca_id'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    product_type = db.Column(db.Enum(ProductType), nullable=False)
    medication_id = db.Column(db.Integer, db.ForeignKey('medications.id'), nullable=True)
    vaccine_id = db.Column(db.Integer, db.ForeignKey('vaccines.id'), nullable=True)
    lot_number = db.Column(db.String(100), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    current_quantity = db.Column(db.Integer, nullable=False)
    unit = db.Column(db.String(50), nullable=False)
    expiry_date = db.Column(db.Date, nullable=False)
    entry_date = db.Column(db.Date, nullable=False, default=date.today)
    supplier = db.Column(db.String(200), nullable=True)
    unit_cost = db.Column(db.Float, nullable=True)
    min_stock = db.Column(db.Integer, nullable=True, default=5)
    notes    = db.Column(db.String(500), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)

    medication = db.relationship('Medications', foreign_keys=[medication_id], lazy='selectin')
    vaccine    = db.relationship('Vaccines', foreign_keys=[vaccine_id], lazy='selectin')
    movements  = db.relationship('InventoryMovement', back_populates='lot', lazy='dynamic')

    _namespace_fields = [
        'id', 'product_type', 'medication_id', 'vaccine_id', 'lot_number',
        'quantity', 'current_quantity', 'unit', 'expiry_date', 'entry_date',
        'supplier', 'unit_cost', 'min_stock', 'notes', 'finca_id', 'created_at', 'updated_at',
    ]
    _namespace_relations = {
        'medication': {'fields': ['id', 'name']},
        'vaccine': {'fields': ['id', 'name']},
    }
    _searchable_fields = ['lot_number', 'supplier', 'notes']
    _filterable_fields = ['product_type', 'medication_id', 'vaccine_id', 'expiry_date', 'entry_date', 'finca_id']
    _sortable_fields = ['id', 'lot_number', 'expiry_date', 'entry_date', 'current_quantity', 'created_at']
    _required_fields = ['product_type', 'lot_number', 'quantity', 'current_quantity', 'unit', 'expiry_date']

    # Date normalization is now handled by BaseModel
    _unique_fields = []
    _enum_fields = {'product_type': ProductType}
    _allowed_input_fields = []

    @property
    def is_expired(self):
        return self.expiry_date < date.today()

    @property
    def days_to_expiry(self):
        return (self.expiry_date - date.today()).days

    @property
    def is_low_stock(self):
        if self.min_stock is None:
            return False
        return self.current_quantity <= self.min_stock

    @property
    def product_name(self):
        if self.medication:
            return self.medication.name
        if self.vaccine:
            return self.vaccine.name
        return None

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        data = super().to_namespace_dict(include_relations=include_relations, depth=depth, fields=fields)
        data['is_expired'] = self.is_expired
        data['days_to_expiry'] = self.days_to_expiry
        data['is_low_stock'] = self.is_low_stock
        data['product_name'] = self.product_name
        return data


class InventoryMovement(BaseModel):
    __tablename__ = 'inventory_movements'
    __table_args__ = (
        Index('ix_inventory_movements_lot_id', 'lot_id'),
        Index('ix_inventory_movements_created_at', 'created_at'),
        Index('ix_inventory_movements_finca_id', 'finca_id'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    lot_id = db.Column(db.Integer, db.ForeignKey('inventory_lots.id'), nullable=False)
    movement_type = db.Column(db.Enum(MovementType), nullable=False)
    quantity = db.Column(db.Integer, nullable=False)
    reference_type = db.Column(db.String(50), nullable=True)
    reference_id = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.String(500), nullable=True)
    actor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)

    lot   = db.relationship('InventoryLot', back_populates='movements', lazy='selectin')
    actor = db.relationship('User', foreign_keys=[actor_id], lazy='selectin')

    _namespace_fields = [
        'id', 'lot_id', 'movement_type', 'quantity', 'reference_type',
        'reference_id', 'notes', 'actor_id', 'finca_id', 'created_at',
    ]
    _namespace_relations = {
        'lot': {'fields': ['id', 'lot_number', 'product_type', 'unit']},
        'actor': {'fields': ['id', 'fullname']},
    }
    _searchable_fields = ['notes', 'reference_type']
    _filterable_fields = ['lot_id', 'movement_type', 'actor_id', 'reference_type', 'finca_id', 'created_at']
    _sortable_fields = ['id', 'movement_type', 'quantity', 'created_at']
    _required_fields = ['lot_id', 'movement_type', 'quantity']
    _unique_fields = []
    _enum_fields = {'movement_type': MovementType}
