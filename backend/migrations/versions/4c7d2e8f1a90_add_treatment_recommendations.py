"""Add veterinary recommendation treatments and scheduled controls.

Revision ID: 4c7d2e8f1a90
Revises: 3b7c1f2a9d10
"""

from alembic import op
import sqlalchemy as sa


revision = "4c7d2e8f1a90"
down_revision = "3b7c1f2a9d10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create recommendation treatments and their scheduled controls."""
    op.create_table(
        "treatment_recommendations",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "animal_id",
            sa.Integer(),
            sa.ForeignKey("animals.id"),
            nullable=False,
        ),
        sa.Column(
            "finca_id",
            sa.Integer(),
            sa.ForeignKey("finca.id"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("recommendation", sa.Text(), nullable=False),
        sa.Column("responsible", sa.String(length=160), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("estimated_end_date", sa.Date(), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("control_interval_days", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default=sa.text("'en_curso'"),
        ),
        sa.Column("final_notes", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("version_id", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
    )
    op.create_index(
        "ix_treatment_recommendations_animal_status",
        "treatment_recommendations",
        ["animal_id", "status"],
    )
    op.create_index(
        "ix_treatment_recommendations_finca_status",
        "treatment_recommendations",
        ["finca_id", "status"],
    )
    op.create_index(
        "ix_treatment_recommendations_end_date",
        "treatment_recommendations",
        ["estimated_end_date"],
    )

    op.create_table(
        "treatment_recommendation_controls",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "treatment_recommendation_id",
            sa.Integer(),
            sa.ForeignKey("treatment_recommendations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("control_date", sa.Date(), nullable=True),
        sa.Column("observation", sa.Text(), nullable=True),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("recorded_by", sa.Integer(), sa.ForeignKey('user.id'), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column("version_id", sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.UniqueConstraint(
            "treatment_recommendation_id",
            "scheduled_date",
            name="uq_recommendation_control_schedule",
        ),
    )
    op.create_index(
        "ix_recommendation_controls_schedule_status",
        "treatment_recommendation_controls",
        ["scheduled_date", "completed"],
    )
    op.create_index(
        "ix_recommendation_controls_treatment",
        "treatment_recommendation_controls",
        ["treatment_recommendation_id"],
    )


def downgrade() -> None:
    """Remove controls first, then recommendation treatments."""
    op.drop_index(
        "ix_recommendation_controls_treatment",
        table_name="treatment_recommendation_controls",
    )
    op.drop_index(
        "ix_recommendation_controls_schedule_status",
        table_name="treatment_recommendation_controls",
    )
    op.drop_table("treatment_recommendation_controls")
    op.drop_index(
        "ix_treatment_recommendations_end_date",
        table_name="treatment_recommendations",
    )
    op.drop_index(
        "ix_treatment_recommendations_finca_status",
        table_name="treatment_recommendations",
    )
    op.drop_index(
        "ix_treatment_recommendations_animal_status",
        table_name="treatment_recommendations",
    )
    op.drop_table("treatment_recommendations")
