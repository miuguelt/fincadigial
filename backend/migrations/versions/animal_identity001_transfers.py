"""Identidad local provisional y transferencias consentidas de animales."""

from alembic import op
import sqlalchemy as sa


revision = "animal_identity001_transfers"
down_revision = "legal001_user_consents"
branch_labels = None
depends_on = None


def _ensure_columns(bind, table_name, required_columns):
    """Rechaza una tabla preexistente que no tenga el contrato completo."""

    inspector = sa.inspect(bind)
    if not inspector.has_table(table_name):
        return

    actual_columns = {column["name"] for column in inspector.get_columns(table_name)}
    missing_columns = set(required_columns) - actual_columns
    if missing_columns:
        raise RuntimeError(
            f"{table_name} existe pero está incompleta; faltan columnas: "
            + ", ".join(sorted(missing_columns))
        )


def _create_index_if_missing(bind, index_name, table_name, columns):
    """Crea un índice solo si la tabla aún no lo tiene."""

    index_names = {
        index.get("name") for index in sa.inspect(bind).get_indexes(table_name)
    }
    if index_name not in index_names:
        op.create_index(index_name, table_name, columns)


def _drop_index_if_present(bind, index_name, table_name):
    """Elimina un índice solo si existe durante un rollback."""

    inspector = sa.inspect(bind)
    if inspector.has_table(table_name):
        index_names = {index.get("name") for index in inspector.get_indexes(table_name)}
        if index_name in index_names:
            op.drop_index(index_name, table_name=table_name)


def _drop_table_if_present(bind, table_name):
    """Elimina una tabla solo si existe durante un rollback."""

    if sa.inspect(bind).has_table(table_name):
        op.drop_table(table_name)


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("animal_identities"):
        op.create_table(
            "animal_identities",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("animal_id", sa.Integer(), nullable=False, unique=True),
            sa.Column("official_code", sa.String(80), nullable=True, unique=True),
            sa.Column("official_system", sa.String(40), nullable=True),
            sa.Column(
                "status", sa.String(20), nullable=False, server_default="PROVISIONAL"
            ),
            sa.Column(
                "origin_type", sa.String(30), nullable=False, server_default="LOCAL"
            ),
            sa.Column("identification_due_at", sa.Date(), nullable=True),
            sa.Column("verified_at", sa.DateTime(), nullable=True),
            sa.Column("last_checked_at", sa.DateTime(), nullable=True),
            sa.Column("verification_reference", sa.String(255), nullable=True),
            sa.Column("evidence_hash", sa.String(128), nullable=True),
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
            sa.ForeignKeyConstraint(["animal_id"], ["animals.id"], ondelete="CASCADE"),
        )
    _ensure_columns(
        bind,
        "animal_identities",
        {
            "id",
            "animal_id",
            "official_code",
            "official_system",
            "status",
            "origin_type",
            "identification_due_at",
            "verified_at",
            "last_checked_at",
            "verification_reference",
            "evidence_hash",
            "created_at",
            "updated_at",
        },
    )
    _create_index_if_missing(
        bind, "ix_animal_identity_status", "animal_identities", ["status"]
    )
    _create_index_if_missing(
        bind, "ix_animal_identity_animal", "animal_identities", ["animal_id"]
    )
    # Backfill seguro para animales creados antes de esta migración. No se
    # inventa un código oficial: quedan como identidad local provisional.
    op.execute(
        sa.text(
            """
            INSERT INTO animal_identities
                (animal_id, status, origin_type, created_at, updated_at)
            SELECT a.id, 'PROVISIONAL', 'LEGACY', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
            FROM animals a
            WHERE NOT EXISTS (
                SELECT 1 FROM animal_identities ai WHERE ai.animal_id = a.id
            )
            """
        )
    )

    inspector = sa.inspect(bind)
    if not inspector.has_table("animal_transfers"):
        op.create_table(
            "animal_transfers",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("animal_id", sa.Integer(), nullable=False),
            sa.Column("origin_finca_id", sa.Integer(), nullable=False),
            sa.Column("destination_finca_id", sa.Integer(), nullable=True),
            sa.Column("seller_user_id", sa.Integer(), nullable=False),
            sa.Column("status", sa.String(20), nullable=False, server_default="OPEN"),
            sa.Column("fingerprint_hash", sa.String(64), nullable=False),
            sa.Column("claim_code_hash", sa.String(64), nullable=False, unique=True),
            sa.Column("original_record", sa.String(255), nullable=False),
            sa.Column("sale_date", sa.Date(), nullable=False),
            sa.Column("buyer_name", sa.String(150), nullable=True),
            sa.Column("notes", sa.String(500), nullable=True),
            sa.Column("expires_at", sa.DateTime(), nullable=True),
            sa.Column("accepted_at", sa.DateTime(), nullable=True),
            sa.Column("accepted_by", sa.Integer(), nullable=True),
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
            sa.ForeignKeyConstraint(["animal_id"], ["animals.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(
                ["origin_finca_id"], ["finca.id"], ondelete="RESTRICT"
            ),
            sa.ForeignKeyConstraint(
                ["destination_finca_id"], ["finca.id"], ondelete="RESTRICT"
            ),
            sa.ForeignKeyConstraint(["seller_user_id"], ["user.id"]),
            sa.ForeignKeyConstraint(["accepted_by"], ["user.id"]),
        )
    _ensure_columns(
        bind,
        "animal_transfers",
        {
            "id",
            "animal_id",
            "origin_finca_id",
            "destination_finca_id",
            "seller_user_id",
            "status",
            "fingerprint_hash",
            "claim_code_hash",
            "original_record",
            "sale_date",
            "buyer_name",
            "notes",
            "expires_at",
            "accepted_at",
            "accepted_by",
            "created_at",
            "updated_at",
        },
    )
    _create_index_if_missing(
        bind,
        "ix_animal_transfer_animal_status",
        "animal_transfers",
        ["animal_id", "status"],
    )
    _create_index_if_missing(
        bind, "ix_animal_transfer_origin", "animal_transfers", ["origin_finca_id"]
    )
    _create_index_if_missing(
        bind, "ix_animal_transfer_fingerprint", "animal_transfers", ["fingerprint_hash"]
    )
    _create_index_if_missing(
        bind, "ix_animal_transfer_code_hash", "animal_transfers", ["claim_code_hash"]
    )

    inspector = sa.inspect(bind)
    if not inspector.has_table("animal_transfer_claims"):
        op.create_table(
            "animal_transfer_claims",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("transfer_id", sa.Integer(), nullable=False),
            sa.Column("claimant_user_id", sa.Integer(), nullable=False),
            sa.Column("destination_finca_id", sa.Integer(), nullable=False),
            sa.Column(
                "status", sa.String(20), nullable=False, server_default="PENDING"
            ),
            sa.Column(
                "requested_history",
                sa.Boolean(),
                nullable=False,
                server_default=sa.true(),
            ),
            sa.Column("submitted_record", sa.String(255), nullable=False),
            sa.Column("submitted_birth_date", sa.Date(), nullable=False),
            sa.Column("submitted_sex", sa.String(20), nullable=False),
            sa.Column("submitted_breeds_id", sa.Integer(), nullable=False),
            sa.Column("fingerprint_hash", sa.String(64), nullable=False),
            sa.Column("submitted_data", sa.JSON(), nullable=True),
            sa.Column("decision_note", sa.String(500), nullable=True),
            sa.Column("decided_by", sa.Integer(), nullable=True),
            sa.Column("decided_at", sa.DateTime(), nullable=True),
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
            sa.ForeignKeyConstraint(
                ["transfer_id"], ["animal_transfers.id"], ondelete="CASCADE"
            ),
            sa.ForeignKeyConstraint(["claimant_user_id"], ["user.id"]),
            sa.ForeignKeyConstraint(
                ["destination_finca_id"], ["finca.id"], ondelete="RESTRICT"
            ),
            sa.ForeignKeyConstraint(["decided_by"], ["user.id"]),
        )
    _ensure_columns(
        bind,
        "animal_transfer_claims",
        {
            "id",
            "transfer_id",
            "claimant_user_id",
            "destination_finca_id",
            "status",
            "requested_history",
            "submitted_record",
            "submitted_birth_date",
            "submitted_sex",
            "submitted_breeds_id",
            "fingerprint_hash",
            "submitted_data",
            "decision_note",
            "decided_by",
            "decided_at",
            "created_at",
            "updated_at",
        },
    )
    _create_index_if_missing(
        bind,
        "ix_animal_claim_transfer_status",
        "animal_transfer_claims",
        ["transfer_id", "status"],
    )
    _create_index_if_missing(
        bind, "ix_animal_claim_user", "animal_transfer_claims", ["claimant_user_id"]
    )


def downgrade():
    bind = op.get_bind()
    _drop_index_if_present(bind, "ix_animal_claim_user", "animal_transfer_claims")
    _drop_index_if_present(
        bind, "ix_animal_claim_transfer_status", "animal_transfer_claims"
    )
    _drop_table_if_present(bind, "animal_transfer_claims")
    _drop_index_if_present(bind, "ix_animal_transfer_code_hash", "animal_transfers")
    _drop_index_if_present(bind, "ix_animal_transfer_fingerprint", "animal_transfers")
    _drop_index_if_present(bind, "ix_animal_transfer_origin", "animal_transfers")
    _drop_index_if_present(bind, "ix_animal_transfer_animal_status", "animal_transfers")
    _drop_table_if_present(bind, "animal_transfers")
    _drop_index_if_present(bind, "ix_animal_identity_animal", "animal_identities")
    _drop_index_if_present(bind, "ix_animal_identity_status", "animal_identities")
    _drop_table_if_present(bind, "animal_identities")
