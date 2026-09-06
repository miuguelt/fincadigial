"""Identificación electrónica del animal: arete NFC y transpondedor LF.

``nfc_uid`` es el número de serie de fábrica del arete de 13.56 MHz que graba
el celular; ``lf_tag_code`` es el código ISO 11784 del bolo o el inyectable,
que ningún celular puede leer y entra por bastón lector.

Ambos son únicos globalmente, no por finca: el serial de un chip es irrepetible
en el mundo, y permitir el mismo en dos fincas convertiría un duplicado real en
un dato válido.

Revision ID: nfc001
Revises: inv002_inventory_ledger
"""

from alembic import op
import sqlalchemy as sa


revision = "nfc001"
down_revision = "inv002_inventory_ledger"
branch_labels = None
depends_on = None


COLUMNS = (
    ("nfc_uid", sa.String(length=32)),
    ("nfc_written_at", sa.DateTime()),
    ("lf_tag_code", sa.String(length=20)),
)

INDEXES = (
    ("ix_animals_nfc_uid", "nfc_uid"),
    ("ix_animals_lf_tag_code", "lf_tag_code"),
)


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # En desarrollo el arranque de la app ejecuta create_all, así que las
    # columnas pueden existir antes de que Alembic llegue aquí. Sin la guarda
    # la migración aborta y bloquea el resto de la cadena.
    existing_columns = {col["name"] for col in inspector.get_columns("animals")}
    with op.batch_alter_table("animals") as batch:
        for name, column_type in COLUMNS:
            if name not in existing_columns:
                batch.add_column(sa.Column(name, column_type, nullable=True))

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("animals")}
    for index_name, column in INDEXES:
        if index_name not in existing_indexes:
            op.create_index(index_name, "animals", [column], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    existing_indexes = {idx["name"] for idx in inspector.get_indexes("animals")}
    for index_name, _ in INDEXES:
        if index_name in existing_indexes:
            op.drop_index(index_name, table_name="animals")

    existing_columns = {col["name"] for col in inspector.get_columns("animals")}
    with op.batch_alter_table("animals") as batch:
        for name, _ in reversed(COLUMNS):
            if name in existing_columns:
                batch.drop_column(name)
