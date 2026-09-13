"""Join independent market and health migrations without coupling their schema.

The market can be installed with `upgrade market001_community_exchange` alone.
This merge keeps the repository's eventual `upgrade head` unambiguous.
"""
revision = "market002_merge_protocols"
down_revision = ("market001_community_exchange", "sani008_treatment_protocols")
branch_labels = None
depends_on = None


def upgrade():
    """Only joins revision metadata; there are no schema operations."""
    return None


def downgrade():
    """Alembic restores the two parent heads; there are no schema operations."""
    return None
