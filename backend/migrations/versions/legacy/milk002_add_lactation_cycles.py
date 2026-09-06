"""Add lactation_cycles table and milk_production unique constraint

Revision ID: milk002
Revises: fix001abc
Create Date: 2026-05-21

Adds:
  1. lactation_cycles table for tracking lactation periods
  2. Unique constraint on milk_production (animal_id, date, milking_session)
"""
from alembic import op
import sqlalchemy as sa


revision = "milk002"
down_revision = "fix001abc"
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


def _has_constraint(table_name, constraint_name):
    if not _has_table(table_name):
        return False
    constraints = _inspector().get_unique_constraints(table_name)
    return any(c["name"] == constraint_name for c in constraints)


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
    # ── 1. Tabla lactation_cycles ───────────────────────────────────────────
    if not _has_table("lactation_cycles"):
        op.create_table(
            "lactation_cycles",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id"), nullable=False),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("calving_date", sa.Date(), nullable=False),
            sa.Column("dry_off_date", sa.Date(), nullable=True),
            sa.Column("expected_dry_off_date", sa.Date(), nullable=True),
            sa.Column("lactation_number", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="Active"),
            sa.Column("peak_liters", sa.Float(), nullable=True),
            sa.Column("peak_date", sa.Date(), nullable=True),
            sa.Column("total_liters_lactation", sa.Float(), nullable=True, server_default="0.0"),
            sa.Column("notes", sa.String(length=500), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_lactation_animal_id", "lactation_cycles", ["animal_id"])
        op.create_index("ix_lactation_finca_id", "lactation_cycles", ["finca_id"])
        op.create_index("ix_lactation_status", "lactation_cycles", ["status"])

    # ── 2. Unique constraint en milk_production ─────────────────────────────
    if _has_table("milk_production") and not _has_constraint("milk_production", "uq_milk_production_animal_date_session"):
        # SQLite no soporta ADD CONSTRAINT, necesitamos recrear la tabla
        # Pero para evitar pérdida de datos, solo creamos el índice único
        op.create_index(
            "uq_milk_production_animal_date_session",
            "milk_production",
            ["animal_id", "date", "milking_session"],
            unique=True
        )


def downgrade():
    if _has_table("lactation_cycles"):
        op.drop_index("ix_lactation_status", table_name="lactation_cycles")
        op.drop_index("ix_lactation_finca_id", table_name="lactation_cycles")
        op.drop_index("ix_lactation_animal_id", table_name="lactation_cycles")
        op.drop_table("lactation_cycles")

    if _has_table("milk_production"):
        try:
            op.drop_index("uq_milk_production_animal_date_session", table_name="milk_production")
        except Exception:
            pass
