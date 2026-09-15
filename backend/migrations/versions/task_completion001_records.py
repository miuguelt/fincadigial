"""Registra la evidencia persistente de cumplimiento de tareas."""

from alembic import op
import sqlalchemy as sa


revision = "task_completion001_records"
down_revision = "animal_identity001_transfers"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("task_completion_records"):
        op.create_table(
            "task_completion_records",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("task_id", sa.Integer(), nullable=False),
            sa.Column("finca_id", sa.Integer(), nullable=False),
            sa.Column("completed_by", sa.Integer(), nullable=True),
            sa.Column(
                "completed_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("notes", sa.Text(), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            sa.Column("version_id", sa.Integer(), nullable=False, server_default="1"),
            sa.Column(
                "is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()
            ),
            sa.Column("deleted_at", sa.DateTime(), nullable=True),
            sa.Column("created_by", sa.Integer(), nullable=True),
            sa.Column("updated_by", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(
                ["task_id"], ["tasks.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["finca_id"], ["finca.id"]),
            sa.ForeignKeyConstraint(["completed_by"], ["user.id"]),
            sa.UniqueConstraint(
                "task_id", name="uq_task_completion_records_task_id"
            ),
        )
        op.create_index(
            "ix_task_completion_records_finca_id",
            "task_completion_records",
            ["finca_id"],
        )
        op.create_index(
            "ix_task_completion_records_completed_at",
            "task_completion_records",
            ["completed_at"],
        )

    # Vincula las tareas que ya estaban completadas antes de desplegar esta
    # mejora. La fecha disponible del histórico es la última actualización.
    status_cast = (
        "CAST(status AS CHAR)"
        if bind.dialect.name in ("mysql", "mariadb")
        else "CAST(status AS TEXT)"
    )
    op.execute(
        sa.text(
            f"""
            INSERT INTO task_completion_records
              (task_id, finca_id, completed_by, completed_at, notes,
               created_at, updated_at, version_id, is_deleted)
            SELECT t.id, t.finca_id, COALESCE(t.updated_by, t.assigned_to),
                   COALESCE(t.updated_at, t.created_at, CURRENT_TIMESTAMP),
                   'Registro histórico vinculado al migrar la trazabilidad de tareas.',
                   CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 1, FALSE
            FROM tasks t
            WHERE {status_cast} IN ('COMPLETED', 'Completada')
              AND NOT EXISTS (
                SELECT 1 FROM task_completion_records r WHERE r.task_id = t.id
              )
            """
        )
    )


def downgrade():
    bind = op.get_bind()
    if sa.inspect(bind).has_table("task_completion_records"):
        op.drop_table("task_completion_records")
