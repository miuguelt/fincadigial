"""merge_milk_migrations

Revision ID: cc9e02e17944
Revises: 
Create Date: 2026-05-21 21:48:33.046160

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cc9e02e17944'
down_revision = ('00d154780d78', 'milk003')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
