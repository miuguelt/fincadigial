"""Use decimal inventory quantities and record before/after balances.

Revision ID: inv002_inventory_ledger
Revises: alerts003
"""

from alembic import op
import sqlalchemy as sa


revision = "inv002_inventory_ledger"
down_revision = "alerts003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    quantity_type = sa.Numeric(12, 3)
    with op.batch_alter_table("inventory_lots", schema=None) as batch:
        batch.alter_column(
            "quantity", existing_type=sa.INTEGER(), type_=quantity_type, existing_nullable=False
        )
        batch.alter_column(
            "current_quantity", existing_type=sa.INTEGER(), type_=quantity_type, existing_nullable=False
        )

    with op.batch_alter_table("inventory_movements", schema=None) as batch:
        batch.alter_column(
            "quantity", existing_type=sa.INTEGER(), type_=quantity_type, existing_nullable=False
        )
        batch.add_column(sa.Column("balance_before", quantity_type, nullable=True))
        batch.add_column(sa.Column("balance_after", quantity_type, nullable=True))

    for table in ("treatment_medications", "treatment_vaccines"):
        with op.batch_alter_table(table, schema=None) as batch:
            batch.alter_column(
                "quantity",
                existing_type=sa.Float(),
                type_=quantity_type,
                existing_nullable=True,
            )


def downgrade() -> None:
    for table in ("treatment_vaccines", "treatment_medications"):
        with op.batch_alter_table(table, schema=None) as batch:
            batch.alter_column(
                "quantity",
                existing_type=sa.Numeric(12, 3),
                type_=sa.Float(),
                existing_nullable=True,
            )

    with op.batch_alter_table("inventory_movements", schema=None) as batch:
        batch.drop_column("balance_after")
        batch.drop_column("balance_before")
        batch.alter_column(
            "quantity", existing_type=sa.Numeric(12, 3), type_=sa.INTEGER(), existing_nullable=False
        )

    with op.batch_alter_table("inventory_lots", schema=None) as batch:
        batch.alter_column(
            "current_quantity", existing_type=sa.Numeric(12, 3), type_=sa.INTEGER(), existing_nullable=False
        )
        batch.alter_column(
            "quantity", existing_type=sa.Numeric(12, 3), type_=sa.INTEGER(), existing_nullable=False
        )
