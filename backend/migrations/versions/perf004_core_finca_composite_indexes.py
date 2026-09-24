"""Add core finca composite indexes for rapid filtering and queries.

Revision ID: perf004_core_finca_indexes
Revises: task_completion001_records
"""

from alembic import op
import sqlalchemy as sa


revision = "perf004_core_finca_indexes"
down_revision = "task_completion001_records"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    def index_exists(table_name: str, index_name: str) -> bool:
        if not inspector.has_table(table_name):
            return False
        existing = {idx["name"] for idx in inspector.get_indexes(table_name)}
        return index_name in existing

    # 1. animals (finca_id, status)
    if not index_exists("animals", "ix_animals_finca_status"):
        op.create_index(
            "ix_animals_finca_status",
            "animals",
            ["finca_id", "status"],
            unique=False,
        )

    # 2. control (finca_id, checkup_date)
    if not index_exists("control", "ix_control_finca_checkup"):
        op.create_index(
            "ix_control_finca_checkup",
            "control",
            ["finca_id", "checkup_date"],
            unique=False,
        )

    # 3. vaccinations (finca_id, vaccination_date)
    if not index_exists("vaccinations", "ix_vaccinations_finca_date"):
        op.create_index(
            "ix_vaccinations_finca_date",
            "vaccinations",
            ["finca_id", "vaccination_date"],
            unique=False,
        )

    # 4. treatments (finca_id, treatment_date)
    if not index_exists("treatments", "ix_treatments_finca_date"):
        op.create_index(
            "ix_treatments_finca_date",
            "treatments",
            ["finca_id", "treatment_date"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    def index_exists(table_name: str, index_name: str) -> bool:
        if not inspector.has_table(table_name):
            return False
        existing = {idx["name"] for idx in inspector.get_indexes(table_name)}
        return index_name in existing

    if index_exists("treatments", "ix_treatments_finca_date"):
        op.drop_index("ix_treatments_finca_date", table_name="treatments")

    if index_exists("vaccinations", "ix_vaccinations_finca_date"):
        op.drop_index("ix_vaccinations_finca_date", table_name="vaccinations")

    if index_exists("control", "ix_control_finca_checkup"):
        op.drop_index("ix_control_finca_checkup", table_name="control")

    if index_exists("animals", "ix_animals_finca_status"):
        op.drop_index("ix_animals_finca_status", table_name="animals")
