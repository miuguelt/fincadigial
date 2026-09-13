"""Planes de manejo transversal por animal (pegamento de seguimientos).

Dos tablas nuevas:

- ``animal_care_plans``: plan por animal (sanitario, reproductivo,
  nutricional, manejo, preventivo) con fechas y estados.
- ``animal_care_plan_stages``: hitos programados del plan, cada uno con su
  estado y la opción de vincular el acto que lo materializa (control,
  vacunación, tratamiento u observación) vía fulfilled_kind/fulfilled_ref_id.

Sigue el mismo patrón ya usado por TreatmentRecommendationControls.

Revision ID: sani007_animal_care_plans
Revises: sani006_reproduction_event_links
"""

from alembic import op
import sqlalchemy as sa

revision = "sani007_animal_care_plans"
down_revision = "sani006_reproduction_event_links"
branch_labels = None
depends_on = None


def _audit_columns():
    return [
        sa.Column(
            "created_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "version_id",
            sa.Integer(),
            nullable=False,
            server_default=sa.text("1"),
        ),
        sa.Column(
            "is_deleted",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("deleted_at", sa.DateTime()),
        sa.Column("created_by", sa.Integer()),
        sa.Column("updated_by", sa.Integer()),
    ]


def _drop_precreated_empty_tables():
    """Dev/legado: si create_all pre-creó las tablas vacías, se retiran para
    que esta migración las cree por el camino canónico. Nunca toca datos:
    si existieran filas, la migración aborta (la función está sin lanzarse
    antes, luego se llama y si hay datos se levanta RuntimeError)."""
    from sqlalchemy import inspect, text

    bind = op.get_bind()
    if not inspect(bind).has_table("animal_care_plans"):
        return
    for table in ("animal_care_plan_stages", "animal_care_plans"):
        count = bind.execute(
            text(f"SELECT count(*) FROM {table}")
        ).scalar()
        if count:
            raise RuntimeError(
                f"animal_care_plans ya tiene datos ({table}: {count} filas); "
                "esta migración crea las tablas desde cero. Revisa el origen."
            )
    for table in ("animal_care_plan_stages", "animal_care_plans"):
        bind.execute(text(f"DROP TABLE {table} CASCADE"))


def _index_exists(bind, table: str, name: str) -> bool:
    if bind.dialect.name == "postgresql":
        from sqlalchemy import text

        row = bind.execute(
            text(
                "SELECT 1 FROM pg_indexes "
                "WHERE schemaname = 'public' AND tablename = :table AND indexname = :name"
            ),
            {"table": table, "name": name},
        ).first()
        return row is not None
    from sqlalchemy import inspect

    return name in {ix["name"] for ix in inspect(bind).get_indexes(table)}


def upgrade() -> None:
    from sqlalchemy import inspect, text

    bind = op.get_bind()
    _drop_precreated_empty_tables()

    # Por diseño del stack, en modo desarrollo el arranque de la app creó las
    # tablas con create_all antes de la migración. Tras el drop anterior no
    # deberían existir; si la carrera las recreó encima del drop (transacción
    # en curso), se convergen con guards en vez de fallar.
    if inspect(bind).has_table("animal_care_plans"):
        rows = bind.execute(text("SELECT count(*) FROM animal_care_plans")).scalar()
        if rows:
            raise RuntimeError(
                "animal_care_plans ya tiene datos; revisa la procedencia"
            )
        print(
            "sani007: animal_care_plans preexistente vacía; se convergen "
            "columnas e índices en vez de crear la tabla."
        )
        # La tabla la creó create_all idéntica al modelo (fuente de verdad);
        # solo nos aseguramos de que existan los índices declarados.
        for name, col_list in [
            ("ix_care_plans_finca_status", ["finca_id", "status"]),
            ("ix_care_plans_animal_id", ["animal_id"]),
            ("ix_care_plans_dates", ["start_date", "end_date"]),
        ]:
            if not _index_exists(bind, "animal_care_plans", name):
                op.create_index(name, "animal_care_plans", col_list)
        if not _index_exists(bind, "animal_care_plan_stages", "ix_care_plan_stages_plan_id"):
            op.create_index("ix_care_plan_stages_plan_id", "animal_care_plan_stages", ["plan_id"])
        if not _index_exists(bind, "animal_care_plan_stages", "ix_care_plan_stages_finca_id"):
            op.create_index("ix_care_plan_stages_finca_id", "animal_care_plan_stages", ["finca_id"])
        if not _index_exists(bind, "animal_care_plan_stages", "ix_care_plan_stages_due_date"):
            op.create_index("ix_care_plan_stages_due_date", "animal_care_plan_stages", ["due_date"])
        return

    # Tipos PG huérfanos: si un entorno de desarrollo dejó los enums
    # (create_all) tras el drop de las tablas, CREATE TYPE fallaría. Se
    # retiran con IF EXISTS; es seguro porque las tablas acabadas de dropear
    # estaban vacías (validadas antes) y ninguna versión anterior de este
    # esquema referencia estos tipos.
    if bind.dialect.name == "postgresql":
        for type_name in ("careplantype", "careplanstatus"):
            bind.execute(text(f"DROP TYPE IF EXISTS public.{type_name} CASCADE"))

    op.create_table(
        "animal_care_plans",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True, autoincrement=True),
        sa.Column("animal_id", sa.Integer(), sa.ForeignKey("animals.id"), nullable=False),
        sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
        sa.Column(
            "plan_type",
            sa.Enum(
                "Sanitario",
                "Reproductivo",
                "Nutricional",
                "Manejo General",
                "Preventivo",
                name="careplantype",
            ),
            nullable=False,
        ),
        sa.Column(
            "status",
            sa.Enum(
                "Borrador",
                "Activo",
                "Completado",
                "Cancelado",
                name="careplanstatus",
            ),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text()),
        *_audit_columns(),
    )
    op.create_index(
        "ix_care_plans_finca_status", "animal_care_plans", ["finca_id", "status"]
    )
    op.create_index("ix_care_plans_animal_id", "animal_care_plans", ["animal_id"])
    op.create_index(
        "ix_care_plans_dates", "animal_care_plans", ["start_date", "end_date"]
    )

    op.create_table(
        "animal_care_plan_stages",
        sa.Column("id", sa.Integer(), nullable=False, primary_key=True, autoincrement=True),
        sa.Column(
            "plan_id",
            sa.Integer(),
            sa.ForeignKey("animal_care_plans.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("finca_id", sa.Integer(), sa.ForeignKey("finca.id"), nullable=False),
        sa.Column("stage_order", sa.Integer(), nullable=False),
        sa.Column("stage_name", sa.String(length=200), nullable=False),
        sa.Column("start_date", sa.Date()),
        sa.Column("due_date", sa.Date()),
        sa.Column("completed", sa.Boolean(), nullable=False),
        sa.Column("completed_at", sa.Date()),
        sa.Column("observation", sa.Text()),
        sa.Column("fulfilled_kind", sa.String(length=40)),
        sa.Column("fulfilled_ref_id", sa.Integer()),
        *_audit_columns(),
        sa.UniqueConstraint("plan_id", "stage_order", name="uq_care_plan_stage_order"),
    )
    op.create_index(
        "ix_care_plan_stages_plan_id", "animal_care_plan_stages", ["plan_id"]
    )
    op.create_index(
        "ix_care_plan_stages_finca_id", "animal_care_plan_stages", ["finca_id"]
    )
    op.create_index(
        "ix_care_plan_stages_due_date", "animal_care_plan_stages", ["due_date"]
    )


def downgrade() -> None:
    op.drop_table("animal_care_plan_stages")
    op.drop_table("animal_care_plans")
