"""Ampliar TransactionCategory con las categorías reales del campo.

El catálogo original (Milk, Animal, Medication, Food, Service, Other) no cubre
gastos cotidianos de una finca —mano de obra, transporte, mantenimiento— ni los
insumos agrícolas, de modo que el registro operativo del campesino tenía que
mandarlos todos a `Other` y perdía la desagregación. `CropActivity.create`
además clasificaba el costo de una labor como `Service` (servicio veterinario),
que es directamente incorrecto.

Postgres almacena el NOMBRE del miembro del enum (`Food`), no su valor
(`Alimento`): las etiquetas que se añaden aquí son los nombres.

Revision ID: fin001_tx_cat
Revises: vetcred001
"""

from alembic import op


revision = "fin001_tx_cat"
down_revision = "vetcred001"
branch_labels = None
depends_on = None


ENUM_NAME = "transactioncategory"

# Nombre en Postgres -> valor expuesto por la API.
NEW_LABELS = [
    "Labor",         # Mano de Obra
    "Transport",     # Transporte
    "Maintenance",   # Mantenimiento
    "Agriculture",   # Insumos Agrícolas
    "Cheese",        # Venta de Queso
    "Crop",          # Venta de Cosecha
]

ORIGINAL_LABELS = ["Milk", "Animal", "Medication", "Food", "Service", "Other"]


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE no puede usarse en la misma transacción que lo
    # crea, así que se ejecuta fuera del bloque transaccional de Alembic.
    with op.get_context().autocommit_block():
        for label in NEW_LABELS:
            op.execute(f"ALTER TYPE {ENUM_NAME} ADD VALUE IF NOT EXISTS '{label}'")


def downgrade() -> None:
    # Postgres no permite quitar etiquetas de un enum: hay que reconstruir el
    # tipo. Las filas que usen una categoría nueva se reclasifican a `Other`
    # para no perder el movimiento —el monto y la descripción se conservan.
    in_list = ", ".join(f"'{label}'" for label in NEW_LABELS)
    original_list = ", ".join(f"'{label}'" for label in ORIGINAL_LABELS)

    op.execute(f"ALTER TABLE transactions ALTER COLUMN category TYPE text USING category::text")
    op.execute(f"UPDATE transactions SET category = 'Other' WHERE category IN ({in_list})")
    op.execute(f"DROP TYPE {ENUM_NAME}")
    op.execute(f"CREATE TYPE {ENUM_NAME} AS ENUM ({original_list})")
    op.execute(
        f"ALTER TABLE transactions ALTER COLUMN category TYPE {ENUM_NAME} "
        f"USING category::{ENUM_NAME}"
    )
