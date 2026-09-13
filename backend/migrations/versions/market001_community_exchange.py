"""Mercado comunitario con consentimiento, conversaciones e historial privado.

Revision ID: market001_community_exchange
Revises: sani007_animal_care_plans
Downgrade removes only the added structures. Export new history before rollback.
"""
from uuid import uuid4
from alembic import op
import sqlalchemy as sa

revision = "market001_community_exchange"
down_revision = "sani007_animal_care_plans"
branch_labels = ("marketplace",)
depends_on = None


def _create_table(name, *columns):
    # Development startup may have called create_all before Alembic runs.
    if not sa.inspect(op.get_bind()).has_table(name):
        op.create_table(name, *columns)


def _create_index(name, table, columns):
    if name not in {index["name"] for index in sa.inspect(op.get_bind()).get_indexes(table)}:
        op.create_index(name, table, columns)


def upgrade():
    op.add_column("market_offers", sa.Column("public_id", sa.String(36)))
    for field, length in [("category", 30), ("exchange_for", 500), ("request_key", 36), ("request_hash", 64)]:
        op.add_column("market_offers", sa.Column(field, sa.String(length), nullable=field != "category",
                                               server_default="other" if field == "category" else None))
    for field in ["community_visible", "share_phone"]:
        op.add_column("market_offers", sa.Column(field, sa.Boolean(), nullable=False, server_default=sa.false()))
    connection = op.get_bind()
    for row in connection.execute(sa.text("SELECT id FROM market_offers")).fetchall():
        connection.execute(sa.text("UPDATE market_offers SET public_id = :public_id WHERE id = :id"),
                           {"public_id": str(uuid4()), "id": row[0]})
    op.alter_column("market_offers", "public_id", nullable=False)
    op.create_unique_constraint("uq_market_offers_public_id", "market_offers", ["public_id"])
    op.create_unique_constraint("uq_market_offer_request", "market_offers", ["created_by", "request_key"])
    _create_table(
        "market_conversations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("offer_id", sa.Integer(), sa.ForeignKey("market_offers.id"), nullable=False),
        sa.Column("offer_snapshot", sa.JSON(), nullable=False),
        sa.Column("owner_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("guest_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("proposal_by", sa.Integer()), sa.Column("terms", sa.Text()),
        sa.Column("owner_confirmed", sa.Boolean(), nullable=False),
        sa.Column("guest_confirmed", sa.Boolean(), nullable=False),
        sa.Column("owner_read_at", sa.DateTime()), sa.Column("guest_read_at", sa.DateTime()),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("offer_id", "guest_id", name="uq_market_participants"),
    )
    existing = {column["name"] for column in sa.inspect(connection).get_columns("market_conversations")}
    if "offer_snapshot" not in existing:
        if connection.execute(sa.text("SELECT count(*) FROM market_conversations")).scalar_one():
            raise RuntimeError("Existen conversaciones sin ficha histórica. Se requiere revisión antes de migrar.")
        op.add_column("market_conversations", sa.Column("offer_snapshot", sa.JSON(), nullable=False))
    for field in ["owner_id", "guest_id"]:
        _create_index(f"ix_market_conversations_{field}", "market_conversations", [field])
    _create_table(
        "market_events", sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("conversation_id", sa.String(36), sa.ForeignKey("market_conversations.id"), nullable=False),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("kind", sa.String(20), nullable=False), sa.Column("body", sa.Text(), nullable=False),
        sa.Column("request_key", sa.String(36), nullable=False), sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("actor_id", "request_key", name="uq_market_event_request"),
    )
    _create_index("ix_market_events_conversation_date", "market_events", ["conversation_id", "created_at"])
    _create_table(
        "market_blocks", sa.Column("blocker_id", sa.Integer(), sa.ForeignKey("user.id"), primary_key=True),
        sa.Column("blocked_id", sa.Integer(), sa.ForeignKey("user.id"), primary_key=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
    )
    _create_table(
        "market_reports", sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("offer_id", sa.Integer(), sa.ForeignKey("market_offers.id"), nullable=False),
        sa.Column("reporter_id", sa.Integer(), sa.ForeignKey("user.id"), nullable=False),
        sa.Column("reason", sa.String(1000), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("offer_id", "reporter_id", name="uq_market_report"),
    )


def downgrade():
    for table in ["market_reports", "market_blocks", "market_events", "market_conversations"]:
        op.drop_table(table)
    op.drop_constraint("uq_market_offer_request", "market_offers", type_="unique")
    op.drop_constraint("uq_market_offers_public_id", "market_offers", type_="unique")
    for field in ["share_phone", "community_visible", "request_hash", "request_key", "exchange_for", "category", "public_id"]:
        op.drop_column("market_offers", field)
