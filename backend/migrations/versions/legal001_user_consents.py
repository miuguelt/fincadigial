"""Store versioned evidence for mandatory public-registration acceptances."""

from alembic import op
import sqlalchemy as sa


revision = "legal001_user_consents"
down_revision = "sani009_assistance_attachments"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("user_consents"):
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
        inspector = sa.inspect(bind)

    required_columns = {
        "id",
        "user_id",
        "purpose",
        "version",
        "consent_text_hash",
        "accepted_at",
        "source",
    }
    actual_columns = {
        column["name"] for column in inspector.get_columns("user_consents")
    }
    missing_columns = required_columns - actual_columns
    if missing_columns:
        raise RuntimeError(
            "user_consents existe pero está incompleta; faltan columnas: "
            + ", ".join(sorted(missing_columns))
        )

    index_names = {
        index.get("name") for index in inspector.get_indexes("user_consents")
    }
    if "ix_user_consents_user_id" not in index_names:
        op.create_index("ix_user_consents_user_id", "user_consents", ["user_id"])


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if not inspector.has_table("user_consents"):
        return

    index_names = {
        index.get("name") for index in inspector.get_indexes("user_consents")
    }
    if "ix_user_consents_user_id" in index_names:
        op.drop_index("ix_user_consents_user_id", table_name="user_consents")
    op.drop_table("user_consents")
