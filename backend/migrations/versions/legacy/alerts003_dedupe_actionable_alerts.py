"""Prevent repeated actionable animal alerts without deleting history.

Revision ID: alerts003
Revises: fin001_tx_cat
"""

from alembic import op
import sqlalchemy as sa


revision = "alerts003"
down_revision = "fin001_tx_cat"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The one-time history classification scans the existing alert archive;
    # the normal API timeout is intentionally too small for a migration of
    # several hundred thousand rows.
    op.execute("SET LOCAL statement_timeout = 0")
    op.add_column(
        "animal_alerts",
        sa.Column("dedupe_key", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "animal_alerts",
        sa.Column("superseded_by_id", sa.Integer(), nullable=True),
    )

    # Preserve the full audit trail: duplicates are hidden as superseded, not
    # deleted. Numeric measurements/dates are normalized in SQL to match the
    # same stable condition identity used by the application.
    op.execute(
        """
        WITH ranked AS (
            SELECT
                id,
                first_value(id) OVER (
                    PARTITION BY
                        COALESCE(finca_id, 0),
                        COALESCE(animal_id, 0),
                        COALESCE(config_id, 0),
                        alert_type,
                        regexp_replace(lower(message), '[-+]?[0-9]+([.,][0-9]+)*[%°]?', '#', 'g')
                    ORDER BY triggered_at DESC NULLS LAST, id DESC
                ) AS keeper_id,
                row_number() OVER (
                    PARTITION BY
                        COALESCE(finca_id, 0),
                        COALESCE(animal_id, 0),
                        COALESCE(config_id, 0),
                        alert_type,
                        regexp_replace(lower(message), '[-+]?[0-9]+([.,][0-9]+)*[%°]?', '#', 'g')
                    ORDER BY triggered_at DESC NULLS LAST, id DESC
                ) AS position
            FROM animal_alerts
            WHERE is_read = false
        )
        UPDATE animal_alerts AS alert
        SET superseded_by_id = ranked.keeper_id
        FROM ranked
        WHERE alert.id = ranked.id AND ranked.position > 1
        """
    )

    # Existing current rows deliberately keep a NULL key.  The engine still
    # recognizes them by computing their signature in memory, while avoiding
    # a database extension dependency during migration. New rows receive the
    # SHA-256 key in application code and are protected by the unique index.
    op.create_index(
        "uq_animal_alerts_unread_dedupe_key",
        "animal_alerts",
        ["dedupe_key"],
        unique=True,
        postgresql_where=sa.text(
            "is_read = false AND dedupe_key IS NOT NULL AND superseded_by_id IS NULL"
        ),
    )
    op.create_index(
        "ix_animal_alerts_finca_current_triggered",
        "animal_alerts",
        ["finca_id", "triggered_at"],
        postgresql_where=sa.text("superseded_by_id IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_animal_alerts_finca_current_triggered", table_name="animal_alerts")
    op.drop_index("uq_animal_alerts_unread_dedupe_key", table_name="animal_alerts")
    op.drop_column("animal_alerts", "superseded_by_id")
    op.drop_column("animal_alerts", "dedupe_key")
