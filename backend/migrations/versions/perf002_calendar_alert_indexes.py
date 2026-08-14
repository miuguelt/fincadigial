"""Add a partial index for bounded high-priority calendar alerts.

Revision ID: perf002_calendar
Revises: perf001_runtime
"""

from alembic import op
import sqlalchemy as sa


revision = "perf002_calendar"
down_revision = "perf001_runtime"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_animal_alerts_finca_priority_unread_triggered",
        "animal_alerts",
        ["finca_id", "priority", "triggered_at"],
        unique=False,
        postgresql_where=sa.text("is_read = false"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_animal_alerts_finca_priority_unread_triggered",
        table_name="animal_alerts",
    )
