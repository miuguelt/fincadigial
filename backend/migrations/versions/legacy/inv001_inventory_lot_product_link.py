"""Add CHECK constraint linking inventory_lots to exactly one product.

Un lote de `product_type='Medicamento'` debe tener `medication_id` y no
`vaccine_id`, y viceversa. Los lotes sembrados por el script `seed_100.py`
(eliminado) quedaron con ambos FKs en NULL; se purgan con
`scripts/purge_orphan_inventory_lots.py --apply`.

Si al migrar aun quedan filas huerfanas, en PostgreSQL la restriccion se crea
`NOT VALID`: bloquea inserciones y actualizaciones nuevas sin abortar el
upgrade. OJO: `NOT VALID` tambien bloquea el UPDATE de una fila huerfana
preexistente, asi que registrar un movimiento sobre esos lotes fallaria hasta
purgarlos. Tras la purga:
`ALTER TABLE inventory_lots VALIDATE CONSTRAINT ck_inventory_lots_product_link;`

Revision ID: inv001_lot_link
Revises: 4c7d2e8f1a90
"""

from alembic import op
import sqlalchemy as sa


revision = "inv001_lot_link"
down_revision = "4c7d2e8f1a90"
branch_labels = None
depends_on = None

CONSTRAINT_NAME = "ck_inventory_lots_product_link"
CHECK_SQL = (
    "(product_type = 'Medicamento' AND medication_id IS NOT NULL AND vaccine_id IS NULL)"
    " OR (product_type = 'Vacuna' AND vaccine_id IS NOT NULL AND medication_id IS NULL)"
)

ORPHAN_COUNT_SQL = sa.text(f"SELECT count(*) FROM inventory_lots WHERE NOT ({CHECK_SQL})")


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name != "postgresql":
        # SQLite/otros: no soportan NOT VALID ni ALTER TABLE ADD CONSTRAINT.
        with op.batch_alter_table("inventory_lots") as batch:
            batch.create_check_constraint(CONSTRAINT_NAME, CHECK_SQL)
        return

    existing = bind.execute(
        sa.text(
            "SELECT 1 FROM pg_constraint WHERE conname = :name "
            "AND conrelid = 'inventory_lots'::regclass"
        ),
        {"name": CONSTRAINT_NAME},
    ).scalar()
    if existing:
        return

    orphans = bind.execute(ORPHAN_COUNT_SQL).scalar() or 0
    suffix = " NOT VALID" if orphans else ""
    op.execute(
        f"ALTER TABLE inventory_lots ADD CONSTRAINT {CONSTRAINT_NAME} "
        f"CHECK ({CHECK_SQL}){suffix}"
    )
    if orphans:
        print(
            f"[inv001] {orphans} lotes sin producto vinculado: restriccion creada NOT VALID. "
            "Ejecutar scripts/purge_orphan_inventory_lots.py --apply y luego "
            f"ALTER TABLE inventory_lots VALIDATE CONSTRAINT {CONSTRAINT_NAME};"
        )


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(f"ALTER TABLE inventory_lots DROP CONSTRAINT IF EXISTS {CONSTRAINT_NAME}")
        return
    with op.batch_alter_table("inventory_lots") as batch:
        batch.drop_constraint(CONSTRAINT_NAME, type_="check")
