"""merge_heads

Revision ID: 00d154780d78
Revises: 
Create Date: 2026-05-21 20:52:08.114356

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '00d154780d78'
down_revision = ('0002994e6a99', 'invitations_v2', 'milk002')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
