"""Fix: Add milking_session column to milk_production and create transactions table

Revision ID: fix001abc
Revises: d4b7c9a2f001
Create Date: 2026-05-21

Esta migración soluciona los errores:
  - sqlite3.OperationalError: no such column: milk_production.milking_session
  - sqlite3.OperationalError: no such column: animal_id (en transactions)

Las migraciones anteriores nunca agregaron:
  1. La columna `milking_session` a la tabla `milk_production`
  2. La tabla `transactions` con sus columnas completas
"""
from alembic import op
import sqlalchemy as sa


revision = "fix001abc"
down_revision = "d4b7c9a2f001"
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


def upgrade():
    # ── 1. Tabla milk_production: agregar columnas faltantes ────────────────
    if _has_table("milk_production"):
        with op.batch_alter_table("milk_production") as batch_op:
            # Columna principal que causaba el crash
            if not _has_column("milk_production", "milking_session"):
                batch_op.add_column(
                    sa.Column(
                        "milking_session",
                        sa.String(length=10),  # Almacenado como string; el Enum Python lo valida
                        nullable=False,
                        server_default="AM",
                    )
                )
            # Columnas de calidad (opcionales) también definidas en el modelo
            if not _has_column("milk_production", "fat_percentage"):
                batch_op.add_column(sa.Column("fat_percentage", sa.Float(), nullable=True))
            if not _has_column("milk_production", "protein_percentage"):
                batch_op.add_column(sa.Column("protein_percentage", sa.Float(), nullable=True))
            if not _has_column("milk_production", "somatic_cells"):
                batch_op.add_column(sa.Column("somatic_cells", sa.Integer(), nullable=True))
            if not _has_column("milk_production", "notes"):
                batch_op.add_column(sa.Column("notes", sa.String(length=500), nullable=True))
            if not _has_column("milk_production", "finca_id"):
                batch_op.add_column(
                    sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=True)
                )
    else:
        # Crear la tabla completa si por alguna razón no existe
        op.create_table(
            "milk_production",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id"), nullable=False),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("liters", sa.Float(), nullable=False),
            sa.Column("milking_session", sa.String(length=10), nullable=False, server_default="AM"),
            sa.Column("fat_percentage", sa.Float(), nullable=True),
            sa.Column("protein_percentage", sa.Float(), nullable=True),
            sa.Column("somatic_cells", sa.Integer(), nullable=True),
            sa.Column("notes", sa.String(length=500), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_milk_production_animal_id", "milk_production", ["animal_id"])
        op.create_index("ix_milk_production_finca_id", "milk_production", ["finca_id"])
        op.create_index("ix_milk_production_date", "milk_production", ["date"])

    # ── 2. Tabla transactions: crear si no existe ───────────────────────────
    if not _has_table("transactions"):
        op.create_table(
            "transactions",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
            sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id"), nullable=True),
            sa.Column("transaction_type", sa.String(length=20), nullable=False),
            sa.Column("category", sa.String(length=50), nullable=False),
            sa.Column("amount", sa.Numeric(12, 2), nullable=False),
            sa.Column("date", sa.Date(), nullable=False),
            sa.Column("description", sa.String(length=255), nullable=True),
            *_common_columns(),
        )
        op.create_index("ix_transactions_finca_id", "transactions", ["finca_id"])
        op.create_index("ix_transactions_date", "transactions", ["date"])
        op.create_index("ix_transactions_animal_id", "transactions", ["animal_id"])


def downgrade():
    # Revertir en orden inverso
    if _has_table("transactions"):
        op.drop_table("transactions")

    if _has_table("milk_production"):
        with op.batch_alter_table("milk_production") as batch_op:
            for col in ["milking_session", "fat_percentage", "protein_percentage", "somatic_cells", "notes"]:
                if _has_column("milk_production", col):
                    batch_op.drop_column(col)
