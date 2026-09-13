"""Store versioned evidence for mandatory public-registration acceptances."""

from alembic import op
import sqlalchemy as sa


revision = "legal001_user_consents"
down_revision = "sani009_assistance_attachments"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "user_consents",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("purpose", sa.String(length=64), nullable=False),
        sa.Column("version", sa.String(length=32), nullable=False),
        sa.Column("consent_text_hash", sa.String(length=64), nullable=False),
        sa.Column("accepted_at", sa.DateTime(), nullable=False),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "user_id",
            "purpose",
            "version",
            name="uq_user_consent_purpose_version",
        ),
    )
    op.create_index("ix_user_consents_user_id", "user_consents", ["user_id"])


def downgrade():
    op.drop_index("ix_user_consents_user_id", table_name="user_consents")
    op.drop_table("user_consents")
