"""Protocolos de tratamiento: base de conocimiento reutilizable por finca.

Dos tablas nuevas:

- ``treatment_protocols``: esquema de tratamiento reutilizable (dosis,
  frecuencia, retiro, duración) ligado opcionalmente a una enfermedad.
- ``treatment_protocol_insumos``: medicamento o vacuna recomendados por el
  protocolo (polimórfico: medicamento o vacuna, nunca ambos).

El protocolo es conocimiento; la aplicación concreta a una res sigue siendo
un ``Treatments``. Mismo patrón tenant que Diseases/Vaccines.

Revision ID: sani008_treatment_protocols
Revises: sani007_animal_care_plans
"""

from alembic import op
import sqlalchemy as sa

revision = "sani008_treatment_protocols"
down_revision = "sani007_animal_care_plans"
branch_labels = None
depends_on = None


def _audit_columns():
    return [
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
        sa.Column(
            "version_id",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("deleted_at", sa.DateTime()),
        sa.Column("created_by", sa.Integer()),
        sa.Column("updated_by", sa.Integer()),
    ]


def upgrade():
    op.create_table(
        "treatment_protocols",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("disease_id", sa.Integer(), nullable=True),
        sa.Column("severity", sa.String(20), nullable=True),
        sa.Column("default_dosis", sa.String(120), nullable=False, server_default=sa.text("''")),
        sa.Column(
            "default_frequency",
            sa.String(120),
            nullable=False,
            server_default=sa.text("''"),
        ),
        sa.Column(
            "withdrawal_days",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("duration_days", sa.Integer(), nullable=True),
        sa.Column(
            "is_default",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("finca_id", sa.Integer(), nullable=False),
        *_audit_columns(),
        sa.ForeignKeyConstraint(["disease_id"], ["diseases.id"]),
        sa.ForeignKeyConstraint(["finca_id"], ["finca.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "name",
            "finca_id",
            name="uq_treatment_protocols_name_finca",
        ),
    )
    op.create_index(
        "ix_treatment_protocols_finca_disease",
        "treatment_protocols",
        ["finca_id", "disease_id"],
        unique=False,
    )
    op.create_index(
        "ix_treatment_protocols_updated_at",
        "treatment_protocols",
        ["updated_at"],
        unique=False,
    )

    op.create_table(
        "treatment_protocol_insumos",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("protocol_id", sa.Integer(), nullable=False),
        sa.Column("finca_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("medication_id", sa.Integer(), nullable=True),
        sa.Column("vaccine_id", sa.Integer(), nullable=True),
        sa.Column("recommended_dosis", sa.String(120), nullable=True),
        sa.Column("recommended_quantity", sa.Numeric(12, 3), nullable=True),
        sa.Column("notes", sa.String(255), nullable=True),
        *_audit_columns(),
        sa.ForeignKeyConstraint(
            ["protocol_id"], ["treatment_protocols.id"]
        ),
        sa.ForeignKeyConstraint(["medication_id"], ["medications.id"]),
        sa.ForeignKeyConstraint(["vaccine_id"], ["vaccines.id"]),
        sa.ForeignKeyConstraint(["finca_id"], ["finca.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_tp_insumos_protocol_finca",
        "treatment_protocol_insumos",
        ["protocol_id", "finca_id"],
        unique=False,
    )
    op.create_index(
        "ix_tp_insumos_updated_at",
        "treatment_protocol_insumos",
        ["updated_at"],
        unique=False,
    )


def downgrade():
    op.drop_index(
        "ix_tp_insumos_updated_at", table_name="treatment_protocol_insumos"
    )
    op.drop_index(
        "ix_tp_insumos_protocol_finca", table_name="treatment_protocol_insumos"
    )
    op.drop_table("treatment_protocol_insumos")
    op.drop_index(
        "ix_treatment_protocols_updated_at", table_name="treatment_protocols"
    )
    op.drop_index(
        "ix_treatment_protocols_finca_disease", table_name="treatment_protocols"
    )
    op.drop_table("treatment_protocols")
