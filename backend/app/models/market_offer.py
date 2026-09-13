import enum
from uuid import uuid4

from app import db
from app.models.base_model import BaseModel


class MarketOfferType(enum.Enum):
    SALE = "sale"
    PURCHASE = "purchase"
    EXCHANGE = "exchange"


class MarketOffer(BaseModel):
    """Oferta campesina local para venta, compra o trueque."""

    __tablename__ = "market_offers"
    __table_args__ = (
        db.Index("ix_market_offers_finca_status", "finca_id", "status"),
        db.Index("ix_market_offers_product", "product_name"),
        db.UniqueConstraint("created_by", "request_key", name="uq_market_offer_request"),
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

    public_id = db.Column(db.String(36), unique=True, nullable=False, default=lambda: str(uuid4()))
    category = db.Column(db.String(30), nullable=False, default="other", server_default="other")
    exchange_for = db.Column(db.String(500), nullable=True)
    community_visible = db.Column(db.Boolean, nullable=False, default=False, server_default="false")
    share_phone = db.Column(db.Boolean, nullable=False, default=False, server_default="false")
    request_key = db.Column(db.String(36), nullable=True)
    request_hash = db.Column(db.String(64), nullable=True)

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


