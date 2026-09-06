"""Add avatar_url to user table

Revision ID: 5f6b46e9abcd
Revises: 00d154780d78
Create Date: 2026-05-26 19:40:00.000000

"""
from alembic import op
import sqlalchemy as sa


revision = '5f6b46e9abcd'
down_revision = ('00d154780d78', 'd6c7b8aa110b')
branch_labels = None
depends_on = None


def upgrade():
    # Usar batch_alter_table para compatibilidad si fuera SQLite, pero aquí es Postgres
    op.add_column('user', sa.Column('avatar_url', sa.String(length=255), nullable=True))


def downgrade():
    op.drop_column('user', 'avatar_url')
