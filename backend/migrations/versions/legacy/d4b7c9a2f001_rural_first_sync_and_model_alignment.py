"""rural first sync and model alignment

Revision ID: d4b7c9a2f001
Revises: 88ce4a8d3f12
Create Date: 2026-05-06

"""
from alembic import op
import sqlalchemy as sa


revision = "d4b7c9a2f001"
down_revision = "88ce4a8d3f12"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(table_name):
    return table_name in _inspector().get_table_names()


def _has_column(table_name, column_name):
    if not _has_table(table_name):
        return False
    return column_name in {col["name"] for col in _inspector().get_columns(table_name)}


def _common_columns():
    return [
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("version_id", sa.Integer(), server_default="1", nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default="0", nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
    ]


def _add_column_if_missing(table_name, column):
    if not _has_column(table_name, column.name):
        with op.batch_alter_table(table_name) as batch_op:
            batch_op.add_column(column)


def upgrade():
    # Alinear columnas modelo <-> DB.
    for col in [
        sa.Column("idFatherFather", sa.Integer(), sa.ForeignKey("animals.id"), nullable=True),
        sa.Column("idFatherMother", sa.Integer(), sa.ForeignKey("animals.id"), nullable=True),
        sa.Column("idMotherFather", sa.Integer(), sa.ForeignKey("animals.id"), nullable=True),
        sa.Column("idMotherMother", sa.Integer(), sa.ForeignKey("animals.id"), nullable=True),
        sa.Column("is_pregnant", sa.Boolean(), server_default="0", nullable=True),
        sa.Column("is_lactating", sa.Boolean(), server_default="0", nullable=True),
        sa.Column("last_calving_date", sa.Date(), nullable=True),
    ]:
        _add_column_if_missing("animals", col)

    for col in [
        sa.Column("last_grazing_date", sa.Date(), nullable=True),
        sa.Column("rest_days", sa.Integer(), server_default="30", nullable=True),
        sa.Column("grazing_days", sa.Integer(), server_default="3", nullable=True),
    ]:
        _add_column_if_missing("fields", col)

    for col in [
        sa.Column("withdrawal_days", sa.Integer(), server_default="0", nullable=True),
        sa.Column("withdrawal_end_date", sa.Date(), nullable=True),
    ]:
        _add_column_if_missing("treatments", col)

    for col in [
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("characteristics", sa.Text(), nullable=True),
    ]:
        _add_column_if_missing("breeds", col)
    _add_column_if_missing("species", sa.Column("description", sa.Text(), nullable=True))

    if not _has_table("animal_groups"):
        op.create_table(
            "animal_groups",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            *_common_columns(),
        )

    if not _has_table("animal_group_membership"):
        op.create_table(
            "animal_group_membership",
            sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id"), primary_key=True),
            sa.Column("group_id", sa.Integer(), sa.ForeignKey("animal_groups.id"), primary_key=True),
        )

    if not _has_table("pasture_aforos"):
        op.create_table(
            "pasture_aforos",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("field_id", sa.Integer(), sa.ForeignKey("fields.id"), nullable=False),
            sa.Column("entry_height", sa.Float(), nullable=True),
            sa.Column("exit_height", sa.Float(), nullable=True),
            sa.Column("pasture_quality", sa.Integer(), server_default="3", nullable=True),
            sa.Column("notes", sa.String(length=255), nullable=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            *_common_columns(),
        )

    if not _has_table("infrastructure"):
        op.create_table(
            "infrastructure",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=100), nullable=False),
            sa.Column("type", sa.String(length=50), nullable=False),
            sa.Column("last_maintenance", sa.Date(), nullable=True),
            sa.Column("next_maintenance", sa.Date(), nullable=True),
            sa.Column("status", sa.String(length=50), server_default="Operativo", nullable=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            *_common_columns(),
        )

    if not _has_table("farm_expenses"):
        op.create_table(
            "farm_expenses",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("expense_date", sa.Date(), nullable=False),
            sa.Column("category", sa.String(length=50), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("is_income", sa.Boolean(), server_default="0", nullable=True),
            *_common_columns(),
        )

    if not _has_table("devices"):
        op.create_table(
            "devices",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("device_id", sa.String(length=128), nullable=False),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("public_key", sa.Text(), nullable=True),
            sa.Column("platform", sa.String(length=40), nullable=True),
            sa.Column("status", sa.String(length=20), server_default="ACTIVE", nullable=False),
            sa.Column("last_seen_at", sa.DateTime(), nullable=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            *_common_columns(),
            sa.UniqueConstraint("finca_id", "device_id", name="uq_devices_finca_device"),
        )
        op.create_index("ix_devices_finca_status", "devices", ["finca_id", "status"])

    if not _has_table("sync_operations"):
        op.create_table(
            "sync_operations",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("operation_id", sa.String(length=128), nullable=False),
            sa.Column("entity_type", sa.String(length=80), nullable=False),
            sa.Column("entity_id", sa.String(length=128), nullable=True),
            sa.Column("operation", sa.String(length=20), nullable=False),
            sa.Column("payload", sa.JSON(), nullable=True),
            sa.Column("base_version", sa.Integer(), nullable=True),
            sa.Column("logical_clock", sa.Integer(), nullable=True),
            sa.Column("priority", sa.Integer(), server_default="100", nullable=False),
            sa.Column("status", sa.String(length=20), server_default="PENDING", nullable=False),
            sa.Column("signature", sa.Text(), nullable=True),
            sa.Column("origin_device_id", sa.String(length=128), nullable=False),
            sa.Column("author_user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("created_at_device", sa.DateTime(), nullable=True),
            sa.Column("applied_at", sa.DateTime(), nullable=True),
            *_common_columns(),
            sa.UniqueConstraint("operation_id", name="uq_sync_operations_operation_id"),
        )
        op.create_index("ix_sync_operations_finca_status", "sync_operations", ["finca_id", "status"])
        op.create_index("ix_sync_operations_cursor", "sync_operations", ["finca_id", "id"])

    if not _has_table("sync_sessions"):
        op.create_table(
            "sync_sessions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("session_id", sa.String(length=128), nullable=False, unique=True),
            sa.Column("local_device_id", sa.String(length=128), nullable=False),
            sa.Column("peer_device_id", sa.String(length=128), nullable=True),
            sa.Column("transport", sa.String(length=40), server_default="lan", nullable=False),
            sa.Column("status", sa.String(length=20), server_default="OPEN", nullable=False),
            sa.Column("operations_sent", sa.Integer(), server_default="0", nullable=False),
            sa.Column("operations_received", sa.Integer(), server_default="0", nullable=False),
            sa.Column("conflicts_count", sa.Integer(), server_default="0", nullable=False),
            sa.Column("started_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("completed_at", sa.DateTime(), nullable=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            *_common_columns(),
        )

    if not _has_table("sync_operation_receipts"):
        op.create_table(
            "sync_operation_receipts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("operation_id", sa.String(length=128), sa.ForeignKey("sync_operations.operation_id"), nullable=False),
            sa.Column("device_id", sa.String(length=128), nullable=False),
            sa.Column("received_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("applied", sa.Boolean(), server_default="0", nullable=False),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            *_common_columns(),
            sa.UniqueConstraint("operation_id", "device_id", name="uq_sync_receipt_operation_device"),
        )

    if not _has_table("sync_conflicts"):
        op.create_table(
            "sync_conflicts",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("operation_id", sa.String(length=128), sa.ForeignKey("sync_operations.operation_id"), nullable=False),
            sa.Column("entity_type", sa.String(length=80), nullable=False),
            sa.Column("entity_id", sa.String(length=128), nullable=True),
            sa.Column("local_payload", sa.JSON(), nullable=True),
            sa.Column("incoming_payload", sa.JSON(), nullable=True),
            sa.Column("resolution", sa.String(length=40), nullable=True),
            sa.Column("resolved_by", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            sa.Column("resolved_at", sa.DateTime(), nullable=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            *_common_columns(),
        )

    if not _has_table("attachment_blobs"):
        op.create_table(
            "attachment_blobs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("attachment_id", sa.String(length=128), nullable=False, unique=True),
            sa.Column("entity_type", sa.String(length=80), nullable=True),
            sa.Column("entity_id", sa.String(length=128), nullable=True),
            sa.Column("filename", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=120), nullable=True),
            sa.Column("sha256", sa.String(length=64), nullable=False),
            sa.Column("total_size", sa.Integer(), server_default="0", nullable=False),
            sa.Column("received_size", sa.Integer(), server_default="0", nullable=False),
            sa.Column("storage_path", sa.String(length=500), nullable=True),
            sa.Column("is_complete", sa.Boolean(), server_default="0", nullable=False),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("uploaded_by", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            *_common_columns(),
            sa.UniqueConstraint("sha256", "finca_id", name="uq_attachment_sha_finca"),
        )

    if not _has_table("node_messages"):
        op.create_table(
            "node_messages",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("message_id", sa.String(length=128), nullable=False, unique=True),
            sa.Column("sender_user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            sa.Column("sender_device_id", sa.String(length=128), nullable=True),
            sa.Column("recipient_user_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
            sa.Column("recipient_node_id", sa.String(length=128), nullable=True),
            sa.Column("message_type", sa.String(length=20), server_default="CHAT", nullable=False),
            sa.Column("content", sa.Text(), nullable=False),
            sa.Column("status", sa.String(length=20), server_default="PENDING", nullable=False),
            sa.Column("priority", sa.Integer(), server_default="100", nullable=False),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            *_common_columns(),
        )
        op.create_index("ix_node_messages_finca_recipient", "node_messages", ["finca_id", "recipient_user_id"])
        op.create_index("ix_node_messages_finca_node", "node_messages", ["finca_id", "recipient_node_id"])

    if not _has_table("territories"):
        op.create_table(
            "territories",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("vereda", sa.String(length=160), nullable=True),
            sa.Column("municipality", sa.String(length=160), nullable=True),
            sa.Column("department", sa.String(length=160), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("connectivity_level", sa.String(length=20), server_default="INTERMITTENT", nullable=False),
            sa.Column("notes", sa.Text(), nullable=True),
            *_common_columns(),
        )

    if not _has_table("community_nodes"):
        op.create_table(
            "community_nodes",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("node_id", sa.String(length=128), nullable=False, unique=True),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("territory_id", sa.Integer(), sa.ForeignKey("territories.id"), nullable=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=True),
            sa.Column("host", sa.String(length=255), nullable=True),
            sa.Column("port", sa.Integer(), nullable=True),
            sa.Column("latitude", sa.Float(), nullable=True),
            sa.Column("longitude", sa.Float(), nullable=True),
            sa.Column("is_active", sa.Boolean(), server_default="1", nullable=False),
            sa.Column("last_seen_at", sa.DateTime(), nullable=True),
            *_common_columns(),
        )


def downgrade():
    for table_name in [
        "community_nodes",
        "territories",
        "node_messages",
        "attachment_blobs",
        "sync_conflicts",
        "sync_operation_receipts",
        "sync_sessions",
        "sync_operations",
        "devices",
        "farm_expenses",
        "infrastructure",
        "pasture_aforos",
        "animal_group_membership",
        "animal_groups",
    ]:
        if _has_table(table_name):
            op.drop_table(table_name)
