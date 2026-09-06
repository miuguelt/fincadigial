"""Add finca_id to health catalogs

Revision ID: adfd6d5ea7d3
Revises: 5f6b46e9abcd
Create Date: 2026-05-26 21:01:34.990478

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'adfd6d5ea7d3'
down_revision = '5f6b46e9abcd'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Add columns as nullable=True
    with op.batch_alter_table('diseases', schema=None) as batch_op:
        batch_op.add_column(sa.Column('finca_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(None, 'finca', ['finca_id'], ['id'])

    with op.batch_alter_table('medications', schema=None) as batch_op:
        batch_op.add_column(sa.Column('finca_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(None, 'finca', ['finca_id'], ['id'])

    with op.batch_alter_table('route_administrations', schema=None) as batch_op:
        batch_op.add_column(sa.Column('finca_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(None, 'finca', ['finca_id'], ['id'])

    with op.batch_alter_table('vaccines', schema=None) as batch_op:
        batch_op.add_column(sa.Column('finca_id', sa.Integer(), nullable=True))
        batch_op.create_foreign_key(None, 'finca', ['finca_id'], ['id'])

    # 2. Update existing rows to use the first available finca_id
    op.execute("UPDATE diseases SET finca_id = (SELECT MIN(id) FROM finca) WHERE finca_id IS NULL")
    op.execute("UPDATE medications SET finca_id = (SELECT MIN(id) FROM finca) WHERE finca_id IS NULL")
    op.execute("UPDATE route_administrations SET finca_id = (SELECT MIN(id) FROM finca) WHERE finca_id IS NULL")
    op.execute("UPDATE vaccines SET finca_id = (SELECT MIN(id) FROM finca) WHERE finca_id IS NULL")
    op.execute("UPDATE treatments SET finca_id = (SELECT MIN(id) FROM finca) WHERE finca_id IS NULL")
    op.execute("UPDATE vaccinations SET finca_id = (SELECT MIN(id) FROM finca) WHERE finca_id IS NULL")

    # 3. Enforce NOT NULL constraint
    with op.batch_alter_table('diseases', schema=None) as batch_op:
        batch_op.alter_column('finca_id', nullable=False)

    with op.batch_alter_table('medications', schema=None) as batch_op:
        batch_op.alter_column('finca_id', nullable=False)

    with op.batch_alter_table('route_administrations', schema=None) as batch_op:
        batch_op.alter_column('finca_id', nullable=False)

    with op.batch_alter_table('vaccines', schema=None) as batch_op:
        batch_op.alter_column('finca_id', nullable=False)

    with op.batch_alter_table('treatments', schema=None) as batch_op:
        batch_op.alter_column('finca_id',
               existing_type=sa.INTEGER(),
               nullable=False)

    with op.batch_alter_table('vaccinations', schema=None) as batch_op:
        batch_op.alter_column('finca_id',
               existing_type=sa.INTEGER(),
               nullable=False)
    # ### end Alembic commands ###


def downgrade():
    with op.batch_alter_table('vaccines', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('finca_id')

    with op.batch_alter_table('vaccinations', schema=None) as batch_op:
        batch_op.alter_column('finca_id',
               existing_type=sa.INTEGER(),
               nullable=True)

    with op.batch_alter_table('treatments', schema=None) as batch_op:
        batch_op.alter_column('finca_id',
               existing_type=sa.INTEGER(),
               nullable=True)

    with op.batch_alter_table('route_administrations', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('finca_id')

    with op.batch_alter_table('medications', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('finca_id')

    with op.batch_alter_table('diseases', schema=None) as batch_op:
        batch_op.drop_constraint(None, type_='foreignkey')
        batch_op.drop_column('finca_id')
    # ### end Alembic commands ###
