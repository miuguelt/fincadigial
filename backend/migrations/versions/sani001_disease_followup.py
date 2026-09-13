"""Seguimiento de episodios de enfermedad (sanidad).

Agrega al episodio la gravedad y la fecha de recuperación, vincula los
tratamientos, vacunaciones, recomendaciones y controles al episodio, y crea
la tabla de avances clínicos (peso, temperatura, estado, observaciones) que
alimenta los gráficos de evolución del animal.

Revision ID: sani001_disease_followup
Revises: perf003_animal_filter
"""

from alembic import op
import sqlalchemy as sa


revision = "sani001_disease_followup"
down_revision = "perf003_animal_filter"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---- Episodio: gravedad y fecha de recuperación ----
    op.add_column(
        "animal_diseases",
        sa.Column("severity", sa.String(length=20), nullable=True),
    )
    op.add_column(
        "animal_diseases",
        sa.Column("recovery_date", sa.Date(), nullable=True),
    )
    op.create_index(
        "ix_animal_diseases_severity", "animal_diseases", ["severity"], unique=False
    )
    op.create_index(
        "ix_animal_diseases_recovery_date",
        "animal_diseases",
        ["recovery_date"],
        unique=False,
    )

    # ---- Vínculos episodio -> registros de seguimiento (todos NULL-safe) ----
    op.add_column(
        "treatments",
        sa.Column(
            "animal_disease_id",
            sa.Integer(),
            sa.ForeignKey("animal_diseases.id", name="fk_treatments_animal_disease"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_treatments_animal_disease", "treatments", ["animal_disease_id"], unique=False
    )

    op.add_column(
        "vaccinations",
        sa.Column(
            "animal_disease_id",
            sa.Integer(),
            sa.ForeignKey("animal_diseases.id", name="fk_vaccinations_animal_disease"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_vaccinations_animal_disease",
        "vaccinations",
        ["animal_disease_id"],
        unique=False,
    )

    op.add_column(
        "treatment_recommendations",
        sa.Column(
            "animal_disease_id",
            sa.Integer(),
            sa.ForeignKey("animal_diseases.id", name="fk_recs_animal_disease"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_treatment_recommendations_animal_disease",
        "treatment_recommendations",
        ["animal_disease_id"],
        unique=False,
    )

    op.add_column(
        "control",
        sa.Column(
            "animal_disease_id",
            sa.Integer(),
            sa.ForeignKey("animal_diseases.id", name="fk_control_animal_disease"),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_control_animal_disease", "control", ["animal_disease_id"], unique=False
    )

    # ---- Avances del episodio (serie temporal para gráficos) ----
    op.create_table(
        "animal_disease_progress",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column(
            "animal_disease_id",
            sa.Integer(),
            sa.ForeignKey("animal_diseases.id", name="fk_progress_animal_disease"),
            nullable=False,
        ),
        sa.Column("progress_date", sa.Date(), nullable=False),
        sa.Column("weight", sa.Float(), nullable=True),
        sa.Column("temperature", sa.Float(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=True),
        sa.Column("observation", sa.Text(), nullable=True),
        sa.Column("performed_by", sa.Integer(), sa.ForeignKey("user.id"), nullable=True),
        sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("version_id", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Integer(), nullable=True),
        sa.Column("updated_by", sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.Index(
            "ix_animal_disease_progress_episode_date",
            "animal_disease_id",
            "progress_date",
        ),
        sa.Index("ix_animal_disease_progress_finca_id", "finca_id"),
    )


def downgrade() -> None:
    op.drop_table("animal_disease_progress")
    op.drop_index("ix_control_animal_disease", table_name="control")
    op.drop_column("control", "animal_disease_id")
    op.drop_index("ix_treatment_recommendations_animal_disease", table_name="treatment_recommendations")
    op.drop_column("treatment_recommendations", "animal_disease_id")
    op.drop_index("ix_vaccinations_animal_disease", table_name="vaccinations")
    op.drop_column("vaccinations", "animal_disease_id")
    op.drop_index("ix_treatments_animal_disease", table_name="treatments")
    op.drop_column("treatments", "animal_disease_id")
    op.drop_index("ix_animal_diseases_recovery_date", table_name="animal_diseases")
    op.drop_index("ix_animal_diseases_severity", table_name="animal_diseases")
    op.drop_column("animal_diseases", "recovery_date")
    op.drop_column("animal_diseases", "severity")
