from app import db
from app.models.base_model import BaseModel
import enum


class ConnectivityLevel(enum.Enum):
    NONE = "none"
    LOW = "low"
    INTERMITTENT = "intermittent"
    GOOD = "good"


class Territory(BaseModel):
    __tablename__ = "territories"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(160), nullable=False)
    vereda = db.Column(db.String(160), nullable=True)
    municipality = db.Column(db.String(160), nullable=True)
    department = db.Column(db.String(160), nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    connectivity_level = db.Column(db.Enum(ConnectivityLevel), nullable=False, default=ConnectivityLevel.INTERMITTENT)
    notes = db.Column(db.Text, nullable=True)

    _namespace_fields = [
        "id", "name", "vereda", "municipality", "department", "latitude",
        "longitude", "connectivity_level", "notes", "created_at"
    ]
    _required_fields = ["name"]
    _enum_fields = {"connectivity_level": ConnectivityLevel}


class CommunityNode(BaseModel):
    __tablename__ = "community_nodes"
    __table_args__ = (
        db.Index("ix_community_nodes_finca_id", "finca_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    node_id = db.Column(db.String(128), nullable=False, unique=True)
    name = db.Column(db.String(160), nullable=False)
    territory_id = db.Column(db.Integer, db.ForeignKey("territories.id"), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=True)
    host = db.Column(db.String(255), nullable=True)
    port = db.Column(db.Integer, nullable=True)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    last_seen_at = db.Column(db.DateTime, nullable=True)

    _namespace_fields = [
        "id", "node_id", "name", "territory_id", "finca_id", "host", "port",
        "latitude", "longitude", "is_active", "last_seen_at", "created_at"
    ]
    _required_fields = ["node_id", "name"]
