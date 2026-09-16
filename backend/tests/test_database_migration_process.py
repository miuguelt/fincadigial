import ast
from pathlib import Path

import pytest
import sqlalchemy as sa
from alembic import command
from alembic.migration import MigrationContext
from flask import Flask
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

from app.services.database_migrations import (
    _alembic_config,
    _ensure_version_table_capacity,
    _unknown_revisions,
    _upgrade_if_required,
    migration_required,
)


MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations" / "versions"


def test_startup_creates_version_table_with_capacity_for_long_revision_ids():
    engine = sa.create_engine("sqlite:///:memory:")

    _ensure_version_table_capacity(engine)

    with engine.connect() as connection:
        version_column = next(
            column
            for column in sa.inspect(connection).get_columns("alembic_version")
            if column["name"] == "version_num"
        )
        assert version_column["type"].length >= 128

    engine.dispose()


@pytest.mark.parametrize("working_directory", ["backend", "external"])
def test_startup_upgrade_loads_env_independently_of_working_directory(
    monkeypatch, tmp_path, working_directory
):
    """Dada una migración pendiente y el env.py real, al arrancar fuera de
    migrations, se debe aplicar y poder revertir en una BD aislada.
    """
    versions = tmp_path / "versions"
    versions.mkdir()
    (versions / "startup_probe.py").write_text(
        "from alembic import op\n"
        "import sqlalchemy as sa\n"
        "revision = 'startup_probe'\n"
        "down_revision = None\n"
        "def upgrade():\n"
        "    op.create_table('startup_probe', sa.Column('id', sa.Integer, primary_key=True))\n"
        "def downgrade():\n"
        "    op.drop_table('startup_probe')\n",
        encoding="utf-8",
    )
    monkeypatch.chdir(
        MIGRATIONS_DIR.parents[1] if working_directory == "backend" else tmp_path
    )
    config = _alembic_config("sqlite:///:memory:")
    config.set_main_option("version_locations", str(versions).replace("%", "%%"))

    probe_app = Flask(__name__)
    probe_app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    probe_db = SQLAlchemy(probe_app)
    Migrate(probe_app, probe_db)

    with probe_app.app_context():
        try:
            assert _upgrade_if_required(config, set(), {"startup_probe"}) is True
            with probe_db.engine.connect() as connection:
                assert sa.inspect(connection).has_table("startup_probe")
                assert MigrationContext.configure(connection).get_current_heads() == (
                    "startup_probe",
                )

            assert (
                _upgrade_if_required(config, {"startup_probe"}, {"startup_probe"})
                is False
            )
            command.downgrade(config, "base")
            with probe_db.engine.connect() as connection:
                assert not sa.inspect(connection).has_table("startup_probe")
                assert MigrationContext.configure(connection).get_current_heads() == ()
        finally:
            probe_db.session.remove()
            probe_db.engine.dispose()


def _migration_metadata(path: Path) -> dict:
    tree = ast.parse(path.read_text(encoding="utf-8"))
    metadata = {}
    functions = set()

    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            functions.add(node.name)
        if (
            isinstance(node, ast.Assign)
            and len(node.targets) == 1
            and isinstance(node.targets[0], ast.Name)
            and node.targets[0].id
            in {"revision", "down_revision", "branch_labels", "depends_on"}
        ):
            metadata[node.targets[0].id] = ast.literal_eval(node.value)

    metadata["functions"] = functions
    return metadata


def test_startup_skips_upgrade_when_database_is_at_all_heads():
    assert (
        migration_required(
            {"task_completion001_records"}, {"task_completion001_records"}
        )
        is False
    )

    calls = []
    upgraded = _upgrade_if_required(
        config=object(),
        current_heads={"task_completion001_records"},
        target_heads={"task_completion001_records"},
        upgrade_fn=lambda *_args: calls.append(True),
    )

    assert upgraded is False
    assert calls == []


def test_startup_requires_upgrade_when_database_is_not_at_all_heads():
    assert migration_required(set(), {"task_completion001_records"}) is True
    assert (
        migration_required(
            {"sani008_treatment_protocols"}, {"task_completion001_records"}
        )
        is True
    )


def test_intermediate_revision_is_pending_but_not_unknown():
    config = _alembic_config("sqlite:///:memory:")

    assert _unknown_revisions({"market001_community_exchange"}, config) == set()
    assert _unknown_revisions({"revision_not_in_image"}, config) == {
        "revision_not_in_image"
    }


def test_active_migration_tree_is_versioned_reversible_and_has_one_head():
    files = sorted(MIGRATIONS_DIR.glob("*.py"))
    assert files, "El árbol activo de Alembic debe estar incluido en el repositorio."

    metadata = {path.name: _migration_metadata(path) for path in files}
    revisions = {item["revision"] for item in metadata.values()}
    roots = {name for name, item in metadata.items() if item["down_revision"] is None}
    children = {
        parent
        for item in metadata.values()
        for parent in (
            item["down_revision"]
            if isinstance(item["down_revision"], tuple)
            else (item["down_revision"],)
        )
        if parent is not None
    }

    assert roots == {"baseline_full_schema.py"}
    assert all("upgrade" in item["functions"] for item in metadata.values())
    assert all("downgrade" in item["functions"] for item in metadata.values())
    assert children <= revisions

    heads = revisions - children
    assert heads == {"task_completion001_records"}


def test_create_app_minimal_mode_skips_external_services(monkeypatch):
    from app import create_app

    monkeypatch.setenv("DOMAIN", "villaluz.example.com")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")
    monkeypatch.setenv("FLASK_SECRET_KEY", "a" * 64)
    monkeypatch.setenv("VILLALUZ_ADMIN_EMAIL", "admin@example.com")
    monkeypatch.setenv("VILLALUZ_ADMIN_PASSWORD", "testpass123")
    monkeypatch.setenv("REDIS_URL", "redis://unreachable:9999/0")

    app = create_app("testing", minimal=True)

    assert app.extensions.get("redis") is None
    assert app.extensions.get("redis_pubsub") is None
    assert app.extensions.get("event_bus") is None
    assert "migrate" in app.extensions
    assert "sqlalchemy" in app.extensions
    # Confirma que la app es completamente utilizable para DB / Migraciones
    with app.app_context():
        engine = app.extensions["migrate"].db.engine
        with engine.connect() as conn:
            assert conn is not None
