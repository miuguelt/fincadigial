"""Reproducción: hilo del ciclo por eventos enlazados.

Cada evento reproductivo (Parto ← Diagnóstico ← Inseminación) puede apuntar al
evento que le dio origen con ''linked_event_id''. Con el eslabón, el historial
del ciclo de una res se recorre como una cadena (cuándo fue servida, cuándo se
confirmó la preñez y cuándo se reportó el parto) sin adivinar relaciones por
fechas.

Revision ID: sani006_reproduction_event_links
Revises: sani005_recommendation_controls_fulfillment
"""

from alembic import op
import sqlalchemy as sa

revision = "sani006_reproduction_event_links"
down_revision = "sani005_recommendation_controls_fulfillment"
branch_labels = None
depends_on = None


def upgrade() -> None:
    from sqlalchemy import inspect, text

    bind = op.get_bind()
    columns = {
        column["name"] for column in inspect(bind).get_columns("reproductive_events")
    }
    if "linked_event_id" not in columns:
        op.add_column(
            "reproductive_events",
            sa.Column("linked_event_id", sa.Integer(), nullable=True),
        )
        op.create_foreign_key(
            "fk_reproduction_linked_event",
            "reproductive_events",
            "reproductive_events",
            ["linked_event_id"],
            ["id"],
            ondelete="SET NULL",
        )
    index_names = {index["name"] for index in inspect(bind).get_indexes("reproductive_events")}
    if bind.dialect.name == "postgresql":
        row = bind.execute(
            text(
                "SELECT indexname FROM pg_indexes WHERE schemaname = 'public' "
                "AND tablename = 'reproductive_events' AND indexname = 'ix_repr_events_linked'"
            )
        ).first()
        exists = row is not None
    else:
        exists = "ix_repr_events_linked" in index_names
    if not exists:
        op.create_index(
            "ix_repr_events_linked",
            "reproductive_events",
            ["linked_event_id"],
            unique=False,
        )


def downgrade() -> None:
    op.drop_index("ix_repr_events_linked", table_name="reproductive_events")
    op.drop_constraint(
        "fk_reproduction_linked_event",
        "reproductive_events",
        type_="foreignkey",
    )
    op.drop_column("reproductive_events", "linked_event_id")
