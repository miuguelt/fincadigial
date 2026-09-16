import importlib.util
from pathlib import Path

import sqlalchemy as sa
from alembic.migration import MigrationContext
from alembic.operations import Operations


VERSIONS_DIR = Path(__file__).resolve().parents[1] / "migrations" / "versions"


def _load_migration(filename: str):
    path = VERSIONS_DIR / filename
    spec = importlib.util.spec_from_file_location(filename[:-3], path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


def _base_schema(*table_names: str) -> sa.MetaData:
    metadata = sa.MetaData()
    for table_name in table_names:
        sa.Table(table_name, metadata, sa.Column("id", sa.Integer, primary_key=True))
    return metadata


def test_user_consents_migration_is_safe_when_table_already_exists(monkeypatch):
    migration = _load_migration("legal001_user_consents.py")
    engine = sa.create_engine("sqlite:///:memory:")
    metadata = _base_schema("user")

    with engine.begin() as connection:
        metadata.create_all(connection)
        monkeypatch.setattr(
            migration,
            "op",
            Operations(MigrationContext.configure(connection)),
        )

        migration.upgrade()
        migration.upgrade()

        assert sa.inspect(connection).has_table("user_consents")


def test_animal_identity_migration_is_safe_when_tables_already_exist(monkeypatch):
    migration = _load_migration("animal_identity001_transfers.py")
    engine = sa.create_engine("sqlite:///:memory:")
    metadata = _base_schema("animals", "finca", "user")

    with engine.begin() as connection:
        metadata.create_all(connection)
        monkeypatch.setattr(
            migration,
            "op",
            Operations(MigrationContext.configure(connection)),
        )

        migration.upgrade()
        migration.upgrade()

        inspector = sa.inspect(connection)
        assert inspector.has_table("animal_identities")
        assert inspector.has_table("animal_transfers")
        assert inspector.has_table("animal_transfer_claims")


def test_treatment_protocols_migration_is_safe_when_tables_already_exist(monkeypatch):
    migration = _load_migration("sani008_treatment_protocols.py")
    engine = sa.create_engine("sqlite:///:memory:")
    metadata = _base_schema("finca", "diseases", "medications", "vaccines")

    with engine.begin() as connection:
        metadata.create_all(connection)
        monkeypatch.setattr(
            migration,
            "op",
            Operations(MigrationContext.configure(connection)),
        )

        migration.upgrade()
        migration.upgrade()

        inspector = sa.inspect(connection)
        assert inspector.has_table("treatment_protocols")
        assert inspector.has_table("treatment_protocol_insumos")
