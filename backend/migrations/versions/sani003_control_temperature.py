"""Control clínico: temperatura en el historial de controles.

El contrato del frontend ya describía ``temperature`` (y otros signos) en el
control, pero el modelo no la persistía: se perdía en la traducción. Se agrega
la columna para que el histórico de controles veterinarios guarde también la
temperatura y pueda analizarse junto con el peso y la alzada.

Revision ID: sani003_control_temperature
Revises: sani002_followup_fk_integrity
"""

from alembic import op
import sqlalchemy as sa


revision = "sani003_control_temperature"
down_revision = "sani002_followup_fk_integrity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("control", sa.Column("temperature", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("control", "temperature")
