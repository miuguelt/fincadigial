"""Bitácora unificada: origen del evento y tipos ampliados.

``animal_health_history`` es la línea de tiempo única del animal. Hasta ahora
solo la escribía el seguimiento de enfermedades; el resto de dominios
(controles, vacunaciones, tratamientos, reproducción, leche, condición
corporal, movimientos ICA) quedaban fuera del historial consolidado.

Esta migración:
1. Agrega ``reference_kind`` para identificar el origen de cada fila junto con
   ``reference_id`` (evita ambigüedad entre tablas) más su índice compuesto.
2. Extiende el enum PG ``healtheventtype`` con los tipos de eventos de los
   nuevos dominios: Reproduction, Movement, Milk, Nutrition.

Revision ID: sani004_unified_health_history
Revises: sani003_control_temperature
"""

from alembic import op
import sqlalchemy as sa

revision = "sani004_unified_health_history"
down_revision = "sani003_control_temperature"
branch_labels = None
depends_on = None

# Valores agregados al enum (los anteriores ya existen en la baseline).
_NEW_ENUM_VALUES = ("Reproduction", "Movement", "Milk", "Nutrition")


def upgrade() -> None:
    from sqlalchemy import inspect

    bind = op.get_bind()
    inspector = inspect(bind)

    # Guards de resto del camino: los statements dentro de un
    # ``autocommit_block`` ya se han persistido si la migración se abortó en
    # medio (p. ej. por un error del ALTER TYPE), así que la reintención no
    # debe tropezar con la columna o el índice ya existentes.
    cols = {
        column["name"] for column in inspector.get_columns("animal_health_history")
    }
    if "reference_kind" not in cols:
        op.add_column(
            "animal_health_history",
            sa.Column("reference_kind", sa.String(length=40), nullable=True),
        )
    index_names = {
        index["name"]
        for index in inspector.get_indexes("animal_health_history")
    }
    if "ix_health_history_reference" not in index_names:
        op.create_index(
            "ix_health_history_reference",
            "animal_health_history",
            ["reference_kind", "reference_id"],
            unique=False,
        )

    if bind.dialect.name == "postgresql":
        # ALTER TYPE ... ADD VALUE no corre dentro de una transacción: bloc de
        # autocommit. El nombre va CALIFICADO con el esquema: la resolución de
        # ALTER TYPE sin calificar puede fallar ("type does not exist") aunque
        # el tipo esté en public y sea visible vía search_path. En
        # SQLite/otros el enum se crea desde los modelos.
        for value in _NEW_ENUM_VALUES:
            with op.get_context().autocommit_block():
                op.execute(
                    sa.text(
                        "ALTER TYPE public.healtheventtype ADD VALUE IF NOT EXISTS "
                        ":value"
                    ).bindparams(value=value)
                )


def downgrade() -> None:
    op.drop_index(
        "ix_health_history_reference",
        table_name="animal_health_history",
    )
    op.drop_column("animal_health_history", "reference_kind")
    # El enum PG no permite remover valores; los tipos nuevos quedan en la
    # definición del tipo pero sin filas que los usen tras el downgrade de
    # columnas. En SQLite el esquema se regenera desde los modelos.
