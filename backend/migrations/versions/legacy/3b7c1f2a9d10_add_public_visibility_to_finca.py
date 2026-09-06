"""Add the public visibility setting required by the Finca model.

Revision ID: 3b7c1f2a9d10
Revises: 3593e009e109
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "3b7c1f2a9d10"
down_revision = "3593e009e109"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Bring the finca table in line with app.models.finca.Finca."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("finca")}
    if "public_visibility" in columns:
        return

    visibility_enum = postgresql.ENUM(
        "minimal",
        "standard",
        "full",
        name="publicvisibility",
        create_type=False,
    )
    visibility_enum.create(bind, checkfirst=True)
    op.add_column(
        "finca",
        sa.Column(
            "public_visibility",
            visibility_enum,
            nullable=False,
            server_default=sa.text("'minimal'::publicvisibility"),
        ),
    )
    op.alter_column("finca", "public_visibility", server_default=None)


def downgrade() -> None:
    """Remove the setting while preserving the shared enum type."""
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("finca")}
    if "public_visibility" in columns:
        op.drop_column("finca", "public_visibility")
