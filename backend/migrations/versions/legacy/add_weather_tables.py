"""add weather tables

Revision ID: add_weather_tables
Revises: 
Create Date: 2026-05-23 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_weather_tables'
down_revision = 'cc9e02e17944'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('weather_records',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('finca_id', sa.Integer(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(), nullable=False),
        sa.Column('temperature_celsius', sa.Float(), nullable=True),
        sa.Column('feels_like_celsius', sa.Float(), nullable=True),
        sa.Column('humidity_percent', sa.Float(), nullable=True),
        sa.Column('wind_speed_kmh', sa.Float(), nullable=True),
        sa.Column('wind_direction_degrees', sa.Float(), nullable=True),
        sa.Column('precipitation_mm', sa.Float(), nullable=True),
        sa.Column('pressure_hpa', sa.Float(), nullable=True),
        sa.Column('uv_index', sa.Float(), nullable=True),
        sa.Column('cloud_cover_percent', sa.Float(), nullable=True),
        sa.Column('weather_code', sa.Integer(), nullable=True),
        sa.Column('weather_condition', sa.String(length=20), nullable=True),
        sa.Column('sunrise_time', sa.Time(), nullable=True),
        sa.Column('sunset_time', sa.Time(), nullable=True),
        sa.Column('latitude', sa.Float(), nullable=True),
        sa.Column('longitude', sa.Float(), nullable=True),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['finca_id'], ['finca.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_weather_records_finca_recorded_at', 'weather_records', ['finca_id', 'recorded_at'], unique=False)
    op.create_index('ix_weather_records_recorded_at', 'weather_records', ['recorded_at'], unique=False)

    op.create_table('weather_alerts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('finca_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=200), nullable=False),
        sa.Column('alert_type', sa.String(length=20), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('recommendation', sa.Text(), nullable=True),
        sa.Column('current_temperature', sa.Float(), nullable=True),
        sa.Column('current_humidity', sa.Float(), nullable=True),
        sa.Column('current_wind_speed', sa.Float(), nullable=True),
        sa.Column('valid_from', sa.DateTime(), nullable=True),
        sa.Column('valid_until', sa.DateTime(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_dismissed', sa.Boolean(), nullable=False),
        sa.Column('dismissed_by', sa.Integer(), nullable=True),
        sa.Column('dismissed_at', sa.DateTime(), nullable=True),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('version_id', sa.Integer(), nullable=False, server_default=sa.text("1")),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True),
        sa.Column('updated_by', sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(['dismissed_by'], ['user.id'], ),
        sa.ForeignKeyConstraint(['finca_id'], ['finca.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_weather_alerts_finca_severity', 'weather_alerts', ['finca_id', 'severity'], unique=False)
    op.create_index('ix_weather_alerts_valid_until', 'weather_alerts', ['valid_until'], unique=False)
    op.create_index('ix_weather_alerts_is_active', 'weather_alerts', ['is_active'], unique=False)


def downgrade():
    op.drop_index('ix_weather_alerts_is_active', table_name='weather_alerts')
    op.drop_index('ix_weather_alerts_valid_until', table_name='weather_alerts')
    op.drop_index('ix_weather_alerts_finca_severity', table_name='weather_alerts')
    op.drop_table('weather_alerts')
    op.drop_index('ix_weather_records_recorded_at', table_name='weather_records')
    op.drop_index('ix_weather_records_finca_recorded_at', table_name='weather_records')
    op.drop_table('weather_records')
