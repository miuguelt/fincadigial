"""Add production_targets table

Revision ID: milk003
Revises: milk002
Create Date: 2026-05-21

Adds production_targets table for setting milk production goals
"""
from alembic import op
import sqlalchemy as sa


revision = "milk003"
down_revision = "milk002"
branch_labels = None
depends_on = None


def _inspector():
    return sa.inspect(op.get_bind())


def _has_table(table_name):
    return table_name in _inspector().get_table_names()


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


def upgrade():
    if not _has_table("production_targets"):
        op.create_table(
            "production_targets",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id"), nullable=True),
            sa.Column("target_liters", sa.Float(), nullable=False),
            sa.Column("period", sa.String(length=20), nullable=False, server_default="Daily"),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default="1"),
            sa.Column("notes", sa.String(length=500), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_production_target_finca_id", "production_targets", ["finca_id"])
        op.create_index("ix_production_target_animal_id", "production_targets", ["animal_id"])
        op.create_index("ix_production_target_period", "production_targets", ["period"])


def downgrade():
    if _has_table("production_targets"):
        op.drop_index("ix_production_target_period", table_name="production_targets")
        op.drop_index("ix_production_target_animal_id", table_name="production_targets")
        op.drop_index("ix_production_target_finca_id", table_name="production_targets")
        op.drop_table("production_targets")
