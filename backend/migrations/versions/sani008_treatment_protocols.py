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
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
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


def _create_index_if_missing(bind, index_name, table_name, columns, unique=False):
    inspector = sa.inspect(bind)
    if inspector.has_table(table_name):
        index_names = {
            index.get("name") for index in inspector.get_indexes(table_name)
        }
        if index_name not in index_names:
            op.create_index(index_name, table_name, columns, unique=unique)


def _drop_index_if_present(bind, index_name, table_name):
    inspector = sa.inspect(bind)
    if inspector.has_table(table_name):
        index_names = {index.get("name") for index in inspector.get_indexes(table_name)}
        if index_name in index_names:
            op.drop_index(index_name, table_name=table_name)


def _drop_table_if_present(bind, table_name):
    if sa.inspect(bind).has_table(table_name):
        op.drop_table(table_name)


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("treatment_protocols"):
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
    _create_index_if_missing(
        bind,
        "ix_treatment_protocols_finca_disease",
        "treatment_protocols",
        ["finca_id", "disease_id"],
        unique=False,
    )
    _create_index_if_missing(
        bind,
        "ix_treatment_protocols_updated_at",
        "treatment_protocols",
        ["updated_at"],
        unique=False,
    )

    if not inspector.has_table("treatment_protocol_insumos"):
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
    _create_index_if_missing(
        bind,
        "ix_tp_insumos_protocol_finca",
        "treatment_protocol_insumos",
        ["protocol_id", "finca_id"],
        unique=False,
    )
    _create_index_if_missing(
        bind,
        "ix_tp_insumos_updated_at",
        "treatment_protocol_insumos",
        ["updated_at"],
        unique=False,
    )


def downgrade():
    bind = op.get_bind()
    _drop_index_if_present(
        bind, "ix_tp_insumos_updated_at", "treatment_protocol_insumos"
    )
    _drop_index_if_present(
        bind, "ix_tp_insumos_protocol_finca", "treatment_protocol_insumos"
    )
    _drop_table_if_present(bind, "treatment_protocol_insumos")
    _drop_index_if_present(
        bind, "ix_treatment_protocols_updated_at", "treatment_protocols"
    )
    _drop_index_if_present(
        bind, "ix_treatment_protocols_finca_disease", "treatment_protocols"
    )
    _drop_table_if_present(bind, "treatment_protocols")
