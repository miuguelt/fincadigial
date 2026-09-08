"""Add indexes for the animals smart-filters toolbar.

Revision ID: perf003_animal_filter
Revises: baseline_full_schema
"""

from alembic import op
import sqlalchemy as sa


revision = "perf003_animal_filter"
down_revision = "baseline_full_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Rangos por edad (destete: 200-250 días) y umbral de peso bajo
    op.create_index("ix_animals_birth_date", "animals", ["birth_date"], unique=False)
    op.create_index("ix_animals_weight", "animals", ["weight"], unique=False)
    # Banderas reproductivas con índice PARCIAL: sólo filas activas, el planner
    # las barre directo para `WHERE is_pregnant = true` / `is_lactating = true`.
    op.create_index(
        "ix_animals_pregnant_true",
        "animals",
        ["id"],
        unique=False,
        postgresql_where=sa.text("is_pregnant IS TRUE"),
    )
    op.create_index(
        "ix_animals_lactating_true",
        "animals",
        ["id"],
        unique=False,
        postgresql_where=sa.text("is_lactating IS TRUE"),
    )


def downgrade() -> None:
    op.drop_index("ix_animals_lactating_true", table_name="animals")
    op.drop_index("ix_animals_pregnant_true", table_name="animals")
    op.drop_index("ix_animals_weight", table_name="animals")
    op.drop_index("ix_animals_birth_date", table_name="animals")
