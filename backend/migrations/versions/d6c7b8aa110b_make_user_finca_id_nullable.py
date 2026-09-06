"""Make User finca_id nullable

Revision ID: d6c7b8aa110b
Revises: add_weather_tables
Create Date: 2026-05-24 00:28:49.506653

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'd6c7b8aa110b'
down_revision = 'add_weather_tables'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('finca_id',
               existing_type=sa.INTEGER(),
               nullable=True)


def downgrade():
    with op.batch_alter_table('user', schema=None) as batch_op:
        batch_op.alter_column('finca_id',
               existing_type=sa.INTEGER(),
               nullable=False)
