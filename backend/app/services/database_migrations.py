"""Ejecución controlada de migraciones Alembic durante el arranque.

El proceso de arranque siempre valida que el árbol de migraciones exista, pero
solo llama a ``upgrade head`` cuando la base de datos no está en los heads
versionados. Esto mantiene las migraciones dentro de cada imagen desplegable y
evita trabajo DDL innecesario en cada reinicio del contenedor.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.script import ScriptDirectory
from alembic.script.revision import ResolutionError
from alembic.util.exc import CommandError
import sqlalchemy as sa

logger = logging.getLogger(__name__)

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ALEMBIC_INI = _BACKEND_ROOT / "migrations" / "alembic.ini"
_VERSION_TABLE = "alembic_version"
_VERSION_COLUMN = "version_num"
_VERSION_COLUMN_LENGTH = 128


def migration_required(current_heads: set[str], target_heads: set[str]) -> bool:
    """Indica si el estado de la base de datos no coincide con todos los heads."""

    return current_heads != target_heads


def _upgrade_if_required(
    config: Config,
    current_heads: set[str],
    target_heads: set[str],
    upgrade_fn=command.upgrade,
) -> bool:
    """Ejecuta Alembic solo cuando hay una diferencia real de revisiones."""

    if not migration_required(current_heads, target_heads):
        logger.info("Migraciones al día; no se ejecuta upgrade.")
        return False

    logger.info("Hay migraciones pendientes; ejecutando upgrade head.")
    upgrade_fn(config, "head")
    return True


def _alembic_config(database_url: str) -> Config:
    """Carga la configuración del árbol versionado sin imprimir credenciales."""

    if not _ALEMBIC_INI.is_file():
        raise RuntimeError(f"No se encontró la configuración Alembic: {_ALEMBIC_INI}")

    config = Config(str(_ALEMBIC_INI))
    config.set_main_option("sqlalchemy.url", database_url.replace("%", "%%"))
    return config


def _ensure_version_table_capacity(engine) -> None:
    """Garantiza espacio para los IDs de revisión actuales y futuros.

    Alembic crea ``version_num`` como ``VARCHAR(32)`` por defecto, pero el
    árbol versionado contiene identificadores más largos. Se crea la tabla con
    una longitud suficiente en una base nueva y se amplía de forma compatible
    en PostgreSQL/MySQL cuando ya existe.
    """

    with engine.begin() as connection:
        inspector = sa.inspect(connection)
        if not inspector.has_table(_VERSION_TABLE):
            metadata = sa.MetaData()
            sa.Table(
                _VERSION_TABLE,
                metadata,
                sa.Column(_VERSION_COLUMN, sa.String(_VERSION_COLUMN_LENGTH), primary_key=True),
            ).create(connection)
            return

        version_column = next(
            (
                column
                for column in inspector.get_columns(_VERSION_TABLE)
                if column["name"] == _VERSION_COLUMN
            ),
            None,
        )
        current_length = getattr(version_column.get("type"), "length", None) if version_column else None
        if not current_length or current_length >= _VERSION_COLUMN_LENGTH:
            return

        if connection.dialect.name == "postgresql":
            connection.execute(
                sa.text(
                    "ALTER TABLE alembic_version "
                    "ALTER COLUMN version_num TYPE VARCHAR(128)"
                )
            )
        elif connection.dialect.name in {"mysql", "mariadb"}:
            connection.execute(
                sa.text(
                    "ALTER TABLE alembic_version "
                    "MODIFY COLUMN version_num VARCHAR(128) NOT NULL"
                )
            )
        else:
            logger.warning(
                "La tabla alembic_version tiene longitud %s; el motor %s no permite "
                "ampliarla automáticamente.",
                current_length,
                connection.dialect.name,
            )


def _revision_state(connection, config: Config) -> tuple[set[str], set[str]]:
    """Obtiene las revisiones instaladas y los heads disponibles en la imagen."""

    script = ScriptDirectory.from_config(config)
    target_heads = set(script.get_heads())
    current_heads = set(MigrationContext.configure(connection).get_current_heads())

    if not target_heads:
        raise RuntimeError("El árbol de migraciones no contiene ningún head activo.")

    return current_heads, target_heads


def _unknown_revisions(current_heads: set[str], config: Config) -> set[str]:
    """Devuelve revisiones de la BD que no existen en el árbol desplegado."""

    script = ScriptDirectory.from_config(config)
    unknown = set()
    for revision in current_heads:
        try:
            script.get_revision(revision)
        except (CommandError, ResolutionError):
            unknown.add(revision)
    return unknown


def run_database_migrations() -> bool:
    """Aplica migraciones pendientes y retorna si se ejecutó algún cambio."""

    from app import create_app, db

    app = create_app(os.getenv("FLASK_ENV", "production"))
    with app.app_context():
        engine = db.engine
        database_url = engine.url.render_as_string(hide_password=False)
        config = _alembic_config(database_url)
        _ensure_version_table_capacity(engine)

        with engine.connect() as connection:
            current_heads, target_heads = _revision_state(connection, config)

        logger.info(
            "Estado de migraciones: actuales=%s, objetivo=%s, motor=%s",
            ",".join(sorted(current_heads)) or "sin_revision",
            ",".join(sorted(target_heads)),
            engine.dialect.name,
        )

        unknown_revisions = _unknown_revisions(current_heads, config)
        if unknown_revisions:
            raise RuntimeError(
                "La base de datos contiene revisiones que no están en esta imagen: "
                + ", ".join(sorted(unknown_revisions))
            )

        upgraded = _upgrade_if_required(config, current_heads, target_heads)
        if not upgraded:
            return False

        with engine.connect() as connection:
            applied_heads, _ = _revision_state(connection, config)

        if applied_heads != target_heads:
            raise RuntimeError(
                "El upgrade terminó sin alcanzar todos los heads: "
                + ", ".join(sorted(applied_heads))
            )

        logger.info("Migraciones aplicadas correctamente hasta head.")
        return True


def main() -> None:
    """Punto de entrada para el proceso de arranque del contenedor."""

    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(levelname)s [migraciones] %(message)s",
    )
    run_database_migrations()


if __name__ == "__main__":
    main()
