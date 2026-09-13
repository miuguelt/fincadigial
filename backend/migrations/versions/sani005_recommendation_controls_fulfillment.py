"""Recomendaciones: acto que materializa cada control de seguimiento.

Un control de recomendación veterinaria (TreatmentRecommendationControls)
cierra el ciclo "indicación → acción" cuando se marca como completado:
''fulfilled_kind'' indica el tipo de registro (control, vaccination,
treatment u observation) y ''fulfilled_ref_id'' su identificador, de modo
que el control programado queda enlazado al acto sanitario real.

Revision ID: sani005_recommendation_controls_fulfillment
Revises: sani004_unified_health_history
"""

from alembic import op
import sqlalchemy as sa

revision = "sani005_recommendation_controls_fulfillment"
down_revision = "sani004_unified_health_history"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from sqlalchemy import inspect

    columns = {
        column["name"]
        for column in inspect(op.get_bind()).get_columns(
            "treatment_recommendation_controls"
        )
    }
    if "fulfilled_kind" not in columns:
        op.add_column(
            "treatment_recommendation_controls",
            sa.Column("fulfilled_kind", sa.String(length=30), nullable=True),
        )
    if "fulfilled_ref_id" not in columns:
        op.add_column(
            "treatment_recommendation_controls",
            sa.Column("fulfilled_ref_id", sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("treatment_recommendation_controls", "fulfilled_ref_id")
    op.drop_column("treatment_recommendation_controls", "fulfilled_kind")
