"""Permite adjuntar una foto o un audio a una solicitud de asistencia técnica.

El archivo se almacena en ``attachment_blobs`` y la solicitud conserva la
referencia para que el campesino y el veterinario puedan consultarlo.
"""

from alembic import op
import sqlalchemy as sa


revision = "sani009_assistance_attachments"
down_revision = "market002_merge_protocols"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    columns = {column["name"] for column in inspector.get_columns("technical_assistance_requests")}
    if "attachment_blob_id" not in columns:
        op.add_column(
            "technical_assistance_requests",
            sa.Column("attachment_blob_id", sa.Integer(), nullable=True),
        )

    foreign_keys = {
        constraint.get("name")
        for constraint in inspector.get_foreign_keys("technical_assistance_requests")
    }
    if "_fk_technical_assistance_attachment_blob_id" not in foreign_keys:
        op.create_foreign_key(
            "_fk_technical_assistance_attachment_blob_id",
            "technical_assistance_requests",
            "attachment_blobs",
            ["attachment_blob_id"],
            ["id"],
        )


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    foreign_keys = {
        constraint.get("name")
        for constraint in inspector.get_foreign_keys("technical_assistance_requests")
    }
    if "_fk_technical_assistance_attachment_blob_id" in foreign_keys:
        op.drop_constraint(
            "_fk_technical_assistance_attachment_blob_id",
            "technical_assistance_requests",
            type_="foreignkey",
        )

    columns = {column["name"] for column in inspector.get_columns("technical_assistance_requests")}
    if "attachment_blob_id" in columns:
        op.drop_column("technical_assistance_requests", "attachment_blob_id")
