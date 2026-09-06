"""enhance join_requests with tokens, expiration, and expanded status

Revision ID: invitations_v2
Revises: animal_v2_schema
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa


revision = 'invitations_v2'
down_revision = 'animal_v2_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('join_requests', sa.Column('invitation_token', sa.String(128), nullable=True))
    op.add_column('join_requests', sa.Column('token_hash', sa.String(256), nullable=True))
    op.add_column('join_requests', sa.Column('invitation_method', sa.Enum('email', 'link', 'qr', 'code', name='invitationmethod'), nullable=True))
    op.add_column('join_requests', sa.Column('max_uses', sa.Integer, server_default='1', nullable=False))
    op.add_column('join_requests', sa.Column('current_uses', sa.Integer, server_default='0', nullable=False))
    op.add_column('join_requests', sa.Column('expires_at', sa.DateTime, nullable=True))

    op.create_index('ix_join_request_token', 'join_requests', ['invitation_token'], unique=True)
    op.create_index('ix_join_request_expires', 'join_requests', ['expires_at'])

    op.add_column('join_requests', sa.Column('processed_by', sa.Integer, sa.ForeignKey('user.id'), nullable=True))


def downgrade() -> None:
    op.drop_column('join_requests', 'processed_by')
    op.drop_index('ix_join_request_expires', 'join_requests')
    op.drop_index('ix_join_request_token', 'join_requests')
    op.drop_column('join_requests', 'expires_at')
    op.drop_column('join_requests', 'current_uses')
    op.drop_column('join_requests', 'max_uses')
    op.drop_column('join_requests', 'invitation_method')
    op.drop_column('join_requests', 'token_hash')
    op.drop_column('join_requests', 'invitation_token')
