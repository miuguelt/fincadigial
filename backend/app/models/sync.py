from app import db
from app.models.base_model import BaseModel
from datetime import datetime, UTC
import enum


class DeviceStatus(enum.Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    LOST = "lost"


class SyncOperationStatus(enum.Enum):
    PENDING = "pending"
    APPLIED = "applied"
    CONFLICT = "conflict"
    REJECTED = "rejected"


class SyncSessionStatus(enum.Enum):
    OPEN = "open"
    COMPLETED = "completed"
    FAILED = "failed"


class Device(BaseModel):
    __tablename__ = "devices"
    __table_args__ = (
        db.UniqueConstraint("finca_id", "device_id", name="uq_devices_finca_device"),
        db.Index("ix_devices_finca_status", "finca_id", "status"),
    )

    id = db.Column(db.Integer, primary_key=True)
    device_id = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(160), nullable=False)
    public_key = db.Column(db.Text, nullable=True)
    platform = db.Column(db.String(40), nullable=True)
    status = db.Column(
        db.Enum(DeviceStatus), nullable=False, default=DeviceStatus.ACTIVE
    )
    last_seen_at = db.Column(db.DateTime, nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    _namespace_fields = [
        "id",
        "device_id",
        "name",
        "platform",
        "status",
        "last_seen_at",
        "finca_id",
        "user_id",
        "created_at",
        "updated_at",
    ]
    _required_fields = ["device_id", "name", "finca_id"]
    _filterable_fields = ["device_id", "status", "finca_id", "user_id"]
    _searchable_fields = ["device_id", "name"]
    _enum_fields = {"status": DeviceStatus}


class SyncOperation(BaseModel):
    __tablename__ = "sync_operations"
    __table_args__ = (
        db.UniqueConstraint("operation_id", name="uq_sync_operations_operation_id"),
        db.Index("ix_sync_operations_finca_status", "finca_id", "status"),
        db.Index("ix_sync_operations_cursor", "finca_id", "id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    operation_id = db.Column(db.String(128), nullable=False)
    entity_type = db.Column(db.String(80), nullable=False)
    entity_id = db.Column(db.String(128), nullable=True)
    operation = db.Column(db.String(20), nullable=False)
    payload = db.Column(db.JSON, nullable=True)
    base_version = db.Column(db.Integer, nullable=True)
    logical_clock = db.Column(db.Integer, nullable=True)
    priority = db.Column(db.Integer, nullable=False, default=100)
    status = db.Column(
        db.Enum(SyncOperationStatus),
        nullable=False,
        default=SyncOperationStatus.PENDING,
    )
    signature = db.Column(db.Text, nullable=True)
    origin_device_id = db.Column(db.String(128), nullable=False)
    author_user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    created_at_device = db.Column(db.DateTime, nullable=True)
    applied_at = db.Column(db.DateTime, nullable=True)

    receipts = db.relationship(
        "SyncOperationReceipt", back_populates="operation_ref", lazy="dynamic"
    )

    _namespace_fields = [
        "id",
        "operation_id",
        "entity_type",
        "entity_id",
        "operation",
        "payload",
        "base_version",
        "logical_clock",
        "priority",
        "status",
        "origin_device_id",
        "author_user_id",
        "finca_id",
        "created_at_device",
        "applied_at",
        "created_at",
    ]
    _required_fields = [
        "operation_id",
        "entity_type",
        "operation",
        "origin_device_id",
        "finca_id",
    ]
    _filterable_fields = [
        "entity_type",
        "entity_id",
        "operation",
        "status",
        "finca_id",
        "origin_device_id",
    ]
    _enum_fields = {"status": SyncOperationStatus}


class SyncSession(BaseModel):
    __tablename__ = "sync_sessions"
    __table_args__ = (db.Index("ix_sync_sessions_finca_id", "finca_id"),)

    id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.String(128), nullable=False, unique=True)
    local_device_id = db.Column(db.String(128), nullable=False)
    peer_device_id = db.Column(db.String(128), nullable=True)
    transport = db.Column(db.String(40), nullable=False, default="lan")
    status = db.Column(
        db.Enum(SyncSessionStatus), nullable=False, default=SyncSessionStatus.OPEN
    )
    operations_sent = db.Column(db.Integer, nullable=False, default=0)
    operations_received = db.Column(db.Integer, nullable=False, default=0)
    conflicts_count = db.Column(db.Integer, nullable=False, default=0)
    started_at = db.Column(
        db.DateTime, default=lambda: datetime.now(UTC), nullable=False
    )
    completed_at = db.Column(db.DateTime, nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    _namespace_fields = [
        "id",
        "session_id",
        "local_device_id",
        "peer_device_id",
        "transport",
        "status",
        "operations_sent",
        "operations_received",
        "conflicts_count",
        "started_at",
        "completed_at",
        "finca_id",
    ]
    _enum_fields = {"status": SyncSessionStatus}


class SyncOperationReceipt(BaseModel):
    __tablename__ = "sync_operation_receipts"
    __table_args__ = (
        db.UniqueConstraint(
            "operation_id", "device_id", name="uq_sync_receipt_operation_device"
        ),
        db.Index("ix_sync_receipts_finca_id", "finca_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    operation_id = db.Column(
        db.String(128), db.ForeignKey("sync_operations.operation_id"), nullable=False
    )
    device_id = db.Column(db.String(128), nullable=False)
    received_at = db.Column(
        db.DateTime, default=lambda: datetime.now(UTC), nullable=False
    )
    applied = db.Column(db.Boolean, nullable=False, default=False)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    operation_ref = db.relationship("SyncOperation", back_populates="receipts")

    _namespace_fields = [
        "id",
        "operation_id",
        "device_id",
        "received_at",
        "applied",
        "finca_id",
    ]


class SyncConflict(BaseModel):
    __tablename__ = "sync_conflicts"
    __table_args__ = (db.Index("ix_sync_conflicts_finca_id", "finca_id"),)

    id = db.Column(db.Integer, primary_key=True)
    operation_id = db.Column(
        db.String(128), db.ForeignKey("sync_operations.operation_id"), nullable=False
    )
    entity_type = db.Column(db.String(80), nullable=False)
    entity_id = db.Column(db.String(128), nullable=True)
    local_payload = db.Column(db.JSON, nullable=True)
    incoming_payload = db.Column(db.JSON, nullable=True)
    resolution = db.Column(db.String(40), nullable=True)
    resolved_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)

    _namespace_fields = [
        "id",
        "operation_id",
        "entity_type",
        "entity_id",
        "local_payload",
        "incoming_payload",
        "resolution",
        "resolved_by",
        "resolved_at",
        "finca_id",
        "created_at",
    ]


class AttachmentBlob(BaseModel):
    __tablename__ = "attachment_blobs"
    __table_args__ = (
        db.UniqueConstraint("sha256", "finca_id", name="uq_attachment_sha_finca"),
        db.Index("ix_attachment_blobs_finca_id", "finca_id"),
    )

    id = db.Column(db.Integer, primary_key=True)
    attachment_id = db.Column(db.String(128), nullable=False, unique=True)
    entity_type = db.Column(db.String(80), nullable=True)
    entity_id = db.Column(db.String(128), nullable=True)
    filename = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(120), nullable=True)
    sha256 = db.Column(db.String(64), nullable=False)
    total_size = db.Column(db.Integer, nullable=False, default=0)
    received_size = db.Column(db.Integer, nullable=False, default=0)
    storage_path = db.Column(db.String(500), nullable=True)
    is_complete = db.Column(db.Boolean, nullable=False, default=False)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=False)
    uploaded_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)

    _namespace_fields = [
        "id",
        "attachment_id",
        "entity_type",
        "entity_id",
        "filename",
        "content_type",
        "sha256",
        "total_size",
        "received_size",
        "storage_path",
        "is_complete",
        "finca_id",
        "uploaded_by",
        "created_at",
    ]
