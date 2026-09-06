"""add animal health history, production metrics, and breed enhancements

Revision ID: animal_v2_schema
Revises: fa2601b628e7
Create Date: 2026-05-21
"""
from alembic import op
import sqlalchemy as sa


revision = 'animal_v2_schema'
down_revision = 'fa2601b628e7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.engine.name == 'postgresql':
        op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'healtheventtype') THEN CREATE TYPE healtheventtype AS ENUM ('Checkup', 'Vaccination', 'Treatment', 'Disease', 'Surgery', 'Deworming'); END IF; END $$;")
        op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'metrictype') THEN CREATE TYPE metrictype AS ENUM ('Weight', 'MilkYield', 'GrowthRate', 'FeedConversion', 'BodyCondition'); END IF; END $$;")
        op.execute("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'breedpurpose') THEN CREATE TYPE breedpurpose AS ENUM ('Milk', 'Meat', 'Dual', 'Work', 'Ornamental'); END IF; END $$;")
        
        health_enum = sa.dialects.postgresql.ENUM('Checkup', 'Vaccination', 'Treatment', 'Disease', 'Surgery', 'Deworming', name='healtheventtype', create_type=False)
        metric_enum = sa.dialects.postgresql.ENUM('Weight', 'MilkYield', 'GrowthRate', 'FeedConversion', 'BodyCondition', name='metrictype', create_type=False)
        purpose_enum = sa.dialects.postgresql.ENUM('Milk', 'Meat', 'Dual', 'Work', 'Ornamental', name='breedpurpose', create_type=False)
    else:
        health_enum = sa.Enum('Checkup', 'Vaccination', 'Treatment', 'Disease', 'Surgery', 'Deworming', name='healtheventtype')
        metric_enum = sa.Enum('Weight', 'MilkYield', 'GrowthRate', 'FeedConversion', 'BodyCondition', name='metrictype')
        purpose_enum = sa.Enum('Milk', 'Meat', 'Dual', 'Work', 'Ornamental', name='breedpurpose')

    op.create_table('animal_health_history',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('animal_id', sa.Integer, sa.ForeignKey('animals.id'), nullable=False),
        sa.Column('finca_id', sa.Integer, sa.ForeignKey('finca.id'), nullable=False),
        sa.Column('event_type', health_enum, nullable=False),
        sa.Column('event_date', sa.Date, nullable=False),
        sa.Column('weight', sa.Float, nullable=True),
        sa.Column('height', sa.Float, nullable=True),
        sa.Column('temperature', sa.Float, nullable=True),
        sa.Column('health_status', sa.String(50), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('performed_by', sa.Integer, sa.ForeignKey('user.id'), nullable=True),
        sa.Column('reference_id', sa.Integer, nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('version_id', sa.Integer, server_default='1', nullable=False),
        sa.Column('is_deleted', sa.Boolean, server_default='0', nullable=False),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
        sa.Column('created_by', sa.Integer, nullable=True),
        sa.Column('updated_by', sa.Integer, nullable=True),
    )
    op.create_index('ix_health_history_animal_date', 'animal_health_history', ['animal_id', 'event_date'])
    op.create_index('ix_health_history_type', 'animal_health_history', ['event_type'])
    op.create_index('ix_health_history_finca', 'animal_health_history', ['finca_id'])

    op.create_table('animal_production_metrics',
        sa.Column('id', sa.Integer, primary_key=True),
        sa.Column('animal_id', sa.Integer, sa.ForeignKey('animals.id'), nullable=False),
        sa.Column('finca_id', sa.Integer, sa.ForeignKey('finca.id'), nullable=False),
        sa.Column('metric_type', metric_enum, nullable=False),
        sa.Column('recorded_date', sa.Date, nullable=False),
        sa.Column('value', sa.Float, nullable=False),
        sa.Column('unit', sa.String(20), server_default='kg', nullable=False),
        sa.Column('notes', sa.Text, nullable=True),
        sa.Column('recorded_by', sa.Integer, sa.ForeignKey('user.id'), nullable=True),
        sa.Column('created_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime, server_default=sa.func.now(), nullable=False),
        sa.Column('version_id', sa.Integer, server_default='1', nullable=False),
        sa.Column('is_deleted', sa.Boolean, server_default='0', nullable=False),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
        sa.Column('created_by', sa.Integer, nullable=True),
        sa.Column('updated_by', sa.Integer, nullable=True),
    )
    op.create_index('ix_prod_metrics_animal_date', 'animal_production_metrics', ['animal_id', 'recorded_date'])
    op.create_index('ix_prod_metrics_type', 'animal_production_metrics', ['metric_type'])
    op.create_index('ix_prod_metrics_finca', 'animal_production_metrics', ['finca_id'])

    op.add_column('breeds', sa.Column('purpose', purpose_enum, nullable=True))
    op.add_column('breeds', sa.Column('origin', sa.String(100), nullable=True))
    op.add_column('breeds', sa.Column('is_active', sa.Boolean, server_default='1', nullable=False))
    op.create_index('ix_breeds_species_purpose', 'breeds', ['species_id', 'purpose'])


def downgrade() -> None:
    op.drop_index('ix_breeds_species_purpose', 'breeds')
    op.drop_column('breeds', 'is_active')
    op.drop_column('breeds', 'origin')
    op.drop_column('breeds', 'purpose')

    op.drop_index('ix_prod_metrics_finca', 'animal_production_metrics')
    op.drop_index('ix_prod_metrics_type', 'animal_production_metrics')
    op.drop_index('ix_prod_metrics_animal_date', 'animal_production_metrics')
    op.drop_table('animal_production_metrics')

    op.drop_index('ix_health_history_finca', 'animal_health_history')
    op.drop_index('ix_health_history_type', 'animal_health_history')
    op.drop_index('ix_health_history_animal_date', 'animal_health_history')
    op.drop_table('animal_health_history')
