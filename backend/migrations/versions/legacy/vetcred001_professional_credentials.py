"""Acreditación profesional del veterinario.

Solo almacena datos público-profesionales cotejables contra registros públicos
(COMVEZCOL, SNIES) más la prueba de la autorización exigida por la Ley 1581 de
2012. No guarda documentos de identidad ni datos sensibles.

Revision ID: vetcred001
Revises: perf002_calendar
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "vetcred001"
down_revision = "perf002_calendar"
branch_labels = None
depends_on = None


# SQLAlchemy persiste el NOMBRE del miembro del enum, no su valor.
TITLE_VALUES = (
    "MedicoVeterinario",
    "MedicoVeterinarioZootecnista",
    "Zootecnista",
)
STATUS_VALUES = (
    "Autodeclarado",
    "EnRevision",
    "Verificado",
    "Rechazado",
    "PorRevalidar",
)

# Los tipos se crean y destruyen aparte, con checkfirst. Dentro de create_table
# se referencian con create_type=False: si no, Postgres intentaría crearlos otra
# vez y la migración falla con "ya existe un tipo".
CREDENTIAL_TITLE = sa.Enum(*TITLE_VALUES, name="credentialtitle")
CREDENTIAL_STATUS = sa.Enum(*STATUS_VALUES, name="credentialstatus")

TITLE_COLUMN_TYPE = postgresql.ENUM(*TITLE_VALUES, name="credentialtitle", create_type=False)
STATUS_COLUMN_TYPE = postgresql.ENUM(*STATUS_VALUES, name="credentialstatus", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    CREDENTIAL_TITLE.create(bind, checkfirst=True)
    CREDENTIAL_STATUS.create(bind, checkfirst=True)

    # En desarrollo el arranque de la app ejecuta create_all, así que la tabla
    # puede existir antes de que Alembic llegue aquí. Sin esta guarda la
    # migración aborta con "la relación ya existe" y bloquea el resto.
    if sa.inspect(bind).has_table("professional_credentials"):
        return

    op.create_table(
        "professional_credentials",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        # Título habilitante
        sa.Column("title", TITLE_COLUMN_TYPE, nullable=False),
        sa.Column("professional_card_number", sa.String(length=20), nullable=False),
        sa.Column(
            "issuing_authority",
            sa.String(length=80),
            nullable=False,
            server_default="COMVEZCOL",
        ),
        sa.Column("card_issued_at", sa.Date(), nullable=True),
        sa.Column("university", sa.String(length=160), nullable=False),
        sa.Column("graduation_year", sa.Integer(), nullable=True),
        sa.Column("specialization", sa.String(length=200), nullable=True),
        # Opcionales
        sa.Column("ica_registration", sa.String(length=60), nullable=True),
        sa.Column("practice_areas", sa.String(length=255), nullable=True),
        sa.Column("liability_insurer", sa.String(length=120), nullable=True),
        sa.Column("liability_policy_number", sa.String(length=60), nullable=True),
        sa.Column("liability_expires_at", sa.Date(), nullable=True),
        # Estado y trazabilidad del cotejo
        sa.Column(
            "status",
            STATUS_COLUMN_TYPE,
            nullable=False,
            server_default="Autodeclarado",
        ),
        sa.Column("verified_by_id", sa.Integer(), nullable=True),
        sa.Column("verified_at", sa.DateTime(), nullable=True),
        sa.Column("verification_source", sa.String(length=120), nullable=True),
        sa.Column("verification_reference", sa.String(length=160), nullable=True),
        sa.Column("verification_expires_at", sa.Date(), nullable=True),
        sa.Column("verification_notes", sa.String(length=255), nullable=True),
        sa.Column("rejection_reason", sa.String(length=255), nullable=True),
        # Prueba de la autorización (Ley 1581 de 2012)
        sa.Column("consent_version", sa.String(length=20), nullable=False),
        sa.Column("consent_accepted_at", sa.DateTime(), nullable=False),
        # Columnas heredadas de BaseModel
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("version_id", sa.Integer(), server_default="1", nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["user.id"]),
        sa.ForeignKeyConstraint(["verified_by_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )

    op.create_index(
        "ix_professional_credential_user",
        "professional_credentials",
        ["user_id"],
        unique=True,
    )
    op.create_index(
        "ix_professional_credential_status",
        "professional_credentials",
        ["status"],
        unique=False,
    )


def downgrade() -> None:
    bind = op.get_bind()
    if sa.inspect(bind).has_table("professional_credentials"):
        op.drop_index("ix_professional_credential_status", table_name="professional_credentials")
        op.drop_index("ix_professional_credential_user", table_name="professional_credentials")
        op.drop_table("professional_credentials")

    CREDENTIAL_STATUS.drop(bind, checkfirst=True)
    CREDENTIAL_TITLE.drop(bind, checkfirst=True)
