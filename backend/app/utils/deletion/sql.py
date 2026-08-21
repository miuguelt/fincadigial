"""Utilidades SQL compartidas por el cálculo de dependencias.

Los nombres de tabla y columna se interpolan en el SQL (no admiten parámetros),
así que cada uno se valida antes de citarse.
"""

from app import db


def validate_identifier(name: str) -> str:
    """Rechaza cualquier identificador que no sea alfanumérico o guion bajo."""
    if not name or not isinstance(name, str):
        raise ValueError(f"Identificador SQL inválido: {name!r}")
    if not all(char.isalnum() or char == "_" for char in name):
        raise ValueError(f"Identificador SQL con caracteres no permitidos: {name!r}")
    if name[0].isdigit():
        raise ValueError(f"Identificador SQL que empieza por dígito: {name!r}")
    return name


def quote_identifier(name: str) -> str:
    """Cita un identificador ya validado (PostgreSQL y SQLite usan comillas dobles)."""
    return f'"{validate_identifier(name)}"'


def has_column(table_name: str, column_name: str) -> bool:
    table = db.metadata.tables.get(table_name)
    return table is not None and column_name in table.columns


def soft_delete_filter(table_name: str) -> str:
    """Fragmento que descarta filas ya eliminadas lógicamente.

    ``COALESCE`` cubre las filas antiguas donde la columna quedó en NULL y
    funciona igual en PostgreSQL y en SQLite.
    """
    if not has_column(table_name, "is_deleted"):
        return ""
    return ' AND COALESCE("is_deleted", FALSE) = FALSE'
