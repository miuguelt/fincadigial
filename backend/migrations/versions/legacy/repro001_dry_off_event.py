"""Evento reproductivo de secado.

Sin él la lactancia solo terminaba por vencimiento (305 días), así que una vaca
seca seguía contando como lactando y el ciclo quedaba abierto sin fecha real.

Revision ID: repro001
Revises: nfc001
"""

from alembic import op

revision = "repro001"
down_revision = "nfc001"
branch_labels = None
depends_on = None

ENUM_NAME = "eventtype"
NEW_LABEL = "Secado"


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE no puede convivir con el uso de la etiqueta en la
    # misma transacción, así que se ejecuta fuera del bloque de Alembic.
    with op.get_context().autocommit_block():
        op.execute(f"ALTER TYPE {ENUM_NAME} ADD VALUE IF NOT EXISTS '{NEW_LABEL}'")


def downgrade() -> None:
    # Postgres no permite quitar etiquetas de un enum: hay que reconstruir el
    # tipo. Los secados registrados se borran porque no tienen equivalente en el
    # esquema anterior; las lactancias que cerraron conservan su `dry_off_date`.
    op.execute(f"DELETE FROM reproductive_events WHERE event_type = '{NEW_LABEL}'")
    op.execute(f"ALTER TYPE {ENUM_NAME} RENAME TO {ENUM_NAME}_old")
    op.execute(
        f"CREATE TYPE {ENUM_NAME} AS ENUM "
        "('Celo', 'Inseminacion', 'Diagnostico', 'Parto')"
    )
    op.execute(
        "ALTER TABLE reproductive_events ALTER COLUMN event_type "
        f"TYPE {ENUM_NAME} USING event_type::text::{ENUM_NAME}"
    )
    op.execute(f"DROP TYPE {ENUM_NAME}_old")
