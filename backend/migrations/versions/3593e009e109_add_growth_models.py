"""Add breed_growth_standards, body_condition_scores, seasonal_adjustments

Revision ID: 3593e009e109
Revises: adfd6d5ea7d3
Create Date: 2026-07-10 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '3593e009e109'
down_revision = 'adfd6d5ea7d3'
branch_labels = None
depends_on = None


def upgrade():
    # Create GrowthStage enum type
    growthstage = postgresql.ENUM(
        'Neonato', 'Lactancia', 'Destete', 'Desarrollo', 'Adulto',
        name='growthstage', create_type=False
    )
    growthstage.create(op.get_bind(), checkfirst=True)

    # 1. breed_growth_standards
    op.create_table('breed_growth_standards',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('breed_id', sa.Integer(), sa.ForeignKey('breeds.id'), nullable=False),
        sa.Column('sex', sa.String(20), nullable=False),
        sa.Column('growth_stage', growthstage, nullable=False),
        sa.Column('age_months', sa.Integer(), nullable=False),
        sa.Column('expected_weight_kg', sa.Float(), nullable=False),
        sa.Column('min_weight_kg', sa.Float(), nullable=False),
        sa.Column('max_weight_kg', sa.Float(), nullable=True),
        sa.Column('expected_adg_kg', sa.Float(), nullable=False),
        sa.Column('min_adg_kg', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('breed_id', 'sex', 'growth_stage', 'age_months',
                           name='uq_breed_growth_standard'),
    )
    op.create_index('ix_bgs_breed_sex_stage', 'breed_growth_standards',
                    ['breed_id', 'sex', 'growth_stage'])
    op.create_index('ix_bgs_age_months', 'breed_growth_standards', ['age_months'])

    # 2. body_condition_scores
    op.create_table('body_condition_scores',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('animal_id', sa.Integer(), sa.ForeignKey('animals.id'), nullable=False),
        sa.Column('finca_id', sa.Integer(), sa.ForeignKey('finca.id'), nullable=False),
        sa.Column('score_date', sa.Date(), nullable=False),
        sa.Column('score', sa.Float(), nullable=False),
        sa.Column('evaluator_id', sa.Integer(), sa.ForeignKey('user.id'), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_bcs_animal_date', 'body_condition_scores', ['animal_id', 'score_date'])
    op.create_index('ix_bcs_finca_date', 'body_condition_scores', ['finca_id', 'score_date'])

    # 3. seasonal_adjustments
    op.create_table('seasonal_adjustments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('finca_id', sa.Integer(), sa.ForeignKey('finca.id'), nullable=False),
        sa.Column('month', sa.Integer(), nullable=False),
        sa.Column('adg_multiplier', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('pasture_quality_index', sa.Float(), nullable=False, server_default='0.5'),
        sa.Column('milk_production_multiplier', sa.Float(), nullable=False, server_default='1.0'),
        sa.Column('heat_stress_risk', sa.String(20), nullable=False, server_default='bajo'),
        sa.Column('description', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('finca_id', 'month', name='uq_seasonal_adj_finca_month'),
    )


def downgrade():
    op.drop_table('seasonal_adjustments')
    op.drop_table('body_condition_scores')
    op.drop_table('breed_growth_standards')

    growthstage = postgresql.ENUM(
        'Neonato', 'Lactancia', 'Destete', 'Desarrollo', 'Adulto',
        name='growthstage', create_type=False
    )
    growthstage.drop(op.get_bind(), checkfirst=True)
