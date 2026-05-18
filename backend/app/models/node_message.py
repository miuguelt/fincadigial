from app import db
from app.models.base_model import BaseModel
import enum


class NodeMessageType(enum.Enum):
    CHAT = "chat"
    ALERT = "alert"
    SYSTEM = "system"


class NodeMessageStatus(enum.Enum):
    PENDING = "pending"
    DELIVERED = "delivered"
    READ = "read"


class NodeMessage(BaseModel):
    __tablename__ = "node_messages"
    __table_args__ = (
        db.Index("ix_node_messages_finca_recipient", "finca_id", "recipient_user_id"),
        db.Index("ix_node_messages_finca_node", "finca_id", "recipient_node_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.String(128), nullable=False, unique=True)
    sender_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    sender_device_id = db.Column(db.String(128), nullable=True)
    recipient_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    recipient_node_id = db.Column(db.String(128), nullable=True)
    message_type = db.Column(db.Enum(NodeMessageType), nullable=False, default=NodeMessageType.CHAT)
    content = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum(NodeMessageStatus), nullable=False, default=NodeMessageStatus.PENDING)
    priority = db.Column(db.Integer, nullable=False, default=100)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    _namespace_fields = [
        "id", "message_id", "sender_user_id", "sender_device_id", "recipient_user_id",
        "recipient_node_id", "message_type", "content", "status", "priority",
        "finca_id", "created_at", "updated_at"
    ]
    _required_fields = ["message_id", "content", "finca_id"]
    _enum_fields = {"message_type": NodeMessageType, "status": NodeMessageStatus}
