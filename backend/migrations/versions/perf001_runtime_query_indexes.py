"""Add indexes for runtime dashboard and high-volume list queries.

Revision ID: perf001_runtime
Revises: inv001_lot_link
"""

from alembic import op
import sqlalchemy as sa


revision = "perf001_runtime"
down_revision = "inv001_lot_link"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_animal_alerts_finca_unread_triggered",
        "animal_alerts",
        ["finca_id", "triggered_at"],
        unique=False,
        postgresql_where=sa.text("is_read = false"),
    )
    op.create_index(
        "ix_milk_production_finca_date",
        "milk_production",
        ["finca_id", "date"],
        unique=False,
    )
    op.create_index(
        "ix_animal_fields_field_active",
        "animal_fields",
        ["field_id", "removal_date"],
        unique=False,
    )
    op.create_index(
        "ix_pasture_aforos_finca_field_created",
        "pasture_aforos",
        ["finca_id", "field_id", "created_at"],
        unique=False,
    )
    op.create_index(
        "ix_recommendation_controls_recorded_by",
        "treatment_recommendation_controls",
        ["recorded_by"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_recommendation_controls_recorded_by",
        table_name="treatment_recommendation_controls",
    )
    op.drop_index(
        "ix_pasture_aforos_finca_field_created",
        table_name="pasture_aforos",
    )
    op.drop_index(
        "ix_animal_fields_field_active",
        table_name="animal_fields",
    )
    op.drop_index(
        "ix_milk_production_finca_date",
        table_name="milk_production",
    )
    op.drop_index(
        "ix_animal_alerts_finca_unread_triggered",
        table_name="animal_alerts",
    )
