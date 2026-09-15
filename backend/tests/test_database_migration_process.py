import ast
from pathlib import Path

from app.services.database_migrations import (
    _alembic_config,
    _unknown_revisions,
    _upgrade_if_required,
    migration_required,
)


MIGRATIONS_DIR = Path(__file__).resolve().parents[1] / "migrations" / "versions"


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
