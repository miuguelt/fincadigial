"""Muestras legibles de los registros que dependen de otro.

Sirven para que el diálogo de confirmación pueda decir *cuáles* registros
bloquean la eliminación, no solo cuántos.
"""

import logging

from sqlalchemy import text

from app import db

from .sql import quote_identifier, soft_delete_filter

logger = logging.getLogger(__name__)

SAMPLE_LIMIT = 5

# Columnas que suelen identificar una fila ante el operador, en orden de preferencia.
_DESCRIPTIVE_COLUMNS = (
    "record",
    "name",
    "nombre",
    "title",
    "titulo",
    "code",
    "codigo",
    "tag",
    "alias",
    "description",
)


def _primary_key(table) -> str:
    columns = [column.name for column in table.primary_key.columns]
    return columns[0] if columns else "id"


def _descriptive_column(table, primary_key: str) -> str | None:
    for candidate in _DESCRIPTIVE_COLUMNS:
        if candidate in table.columns:
            return candidate
    for column in table.columns:
        if column.name != primary_key and not column.name.endswith("_id"):
            return column.name
    return None


def fetch_samples(
    child_table: str, child_column: str, record_id: int
) -> list[dict[str, object]]:
    """Devuelve hasta ``SAMPLE_LIMIT`` filas dependientes con una etiqueta legible."""
    table = db.metadata.tables.get(child_table)
    if table is None:
        return []

    primary_key = _primary_key(table)
    descriptive = _descriptive_column(table, primary_key)
    columns = quote_identifier(primary_key)
    if descriptive:
        columns += f", {quote_identifier(descriptive)}"

    query = text(
        f"SELECT {columns} FROM {quote_identifier(child_table)} "
        f"WHERE {quote_identifier(child_column)} = :record_id"
        f"{soft_delete_filter(child_table)} LIMIT {SAMPLE_LIMIT}"
    )

    try:
        rows = db.session.execute(query, {"record_id": record_id}).fetchall()
    except Exception as exc:  # pragma: no cover - depende del esquema real
        logger.warning("No se pudieron leer muestras de %s: %s", child_table, exc)
        return []

    samples: list[dict[str, object]] = []
    for row in rows:
        identifier = row[0]
        label = str(row[1]) if descriptive and row[1] is not None else f"ID: {identifier}"
        samples.append({"id": identifier, "name": label})
    return samples
