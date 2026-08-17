"""Modelos para alertas configurables de cultivos y fuentes de agua.

Estas tablas ya existen en la base de datos y el motor de alertas las usa, pero
los modelos se habían perdido del registro ORM. Mantenerlos separados de las
alertas de animales evita mezclar sus ciclos de vida y permite que el motor
funcione aunque no haya reglas configuradas para una finca.
"""

from app import db
from app.models.base_model import BaseModel


class FarmEntityAlertConfig(BaseModel):
    __tablename__ = "farm_entity_alert_configs"

    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=True)
    dimension = db.Column(db.String(80), nullable=False)
    condition_value = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    priority = db.Column(db.String(50), nullable=True)
    is_active = db.Column(
        db.Boolean, default=True, server_default="true", nullable=False
    )
    is_default = db.Column(
        db.Boolean, default=False, server_default="false", nullable=False
    )
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    _namespace_fields = [
        "id",
        "entity_type",
        "entity_id",
        "dimension",
        "condition_value",
        "message",
        "priority",
        "is_active",
        "is_default",
        "finca_id",
        "created_at",
        "updated_at",
    ]
    _filterable_fields = [
        "entity_type",
        "entity_id",
        "dimension",
        "is_active",
        "finca_id",
    ]
    _searchable_fields = ["message", "condition_value"]
    _sortable_fields = ["id", "created_at", "updated_at"]


class FarmEntityAlert(BaseModel):
    __tablename__ = "farm_entity_alerts"

    id = db.Column(db.Integer, primary_key=True)
    entity_type = db.Column(db.String(50), nullable=False)
    entity_id = db.Column(db.Integer, nullable=True)
    config_id = db.Column(db.Integer, nullable=True)
    alert_type = db.Column(db.String(80), nullable=False)
    message = db.Column(db.Text, nullable=False)
    recommendation = db.Column(db.Text, nullable=True)
    priority = db.Column(db.String(50), nullable=True)
    is_read = db.Column(
        db.Boolean, default=False, server_default="false", nullable=False
    )
    triggered_at = db.Column(db.DateTime, nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    _namespace_fields = [
        "id",
        "entity_type",
        "entity_id",
        "config_id",
        "alert_type",
        "message",
        "recommendation",
        "priority",
        "is_read",
        "triggered_at",
        "finca_id",
        "created_at",
    ]
    _filterable_fields = [
        "entity_type",
        "entity_id",
        "config_id",
        "priority",
        "is_read",
        "finca_id",
    ]
    _searchable_fields = ["message", "recommendation"]
    _sortable_fields = ["id", "triggered_at", "created_at"]
