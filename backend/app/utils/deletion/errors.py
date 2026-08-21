"""Traducción de errores de integridad de la base de datos a lenguaje del operador.

Cuando el chequeo previo no alcanzó a ver una dependencia (por ejemplo, una
fila creada entre la verificación y el borrado), la base de datos rechaza la
operación. Aquí ese rechazo se convierte en un motivo entendible.
"""

import re

from .labels import table_label

# PostgreSQL en inglés y en español, y MySQL. SQLite no informa la tabla.
# El nombre buscado es el de la tabla que *referencia*, no el de la que se borra:
# por eso los patrones exigen la constraint delante o toman la última aparición.
_REFERENCING_TABLE_PATTERNS = (
    re.compile(r'constraint "[^"]+" on table "(?P<table>[^"]+)"', re.IGNORECASE),
    re.compile(r"«[^»]+» en la tabla «(?P<table>[^»]+)»", re.IGNORECASE),
    re.compile(r"`[^`]+`\.`(?P<table>[^`]+)`, CONSTRAINT", re.S),
    re.compile(r'on table "(?P<table>[^"]+)"', re.IGNORECASE),
    re.compile(r"en la tabla «(?P<table>[^»]+)»", re.IGNORECASE),
)

_FOREIGN_KEY_HINTS = (
    "foreign key",
    "llave foránea",
    "clave foránea",
    "violates foreign key",
    "parent row",
)


def is_foreign_key_violation(error: Exception) -> bool:
    """¿El error viene de una referencia que impide borrar la fila?"""
    text = str(getattr(error, "orig", error)).lower()
    return any(hint in text for hint in _FOREIGN_KEY_HINTS)


def referencing_table(error: Exception) -> str | None:
    """Tabla que sigue apuntando al registro, si el motor la informa."""
    text = str(getattr(error, "orig", error))
    for pattern in _REFERENCING_TABLE_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group("table")
    return None


def explain_integrity_error(error: Exception, record_label: str) -> dict[str, object]:
    """Motivo y detalles para responder un 409 en lugar de un 500."""
    table = referencing_table(error)
    if table:
        label = table_label(table)
        message = (
            f"No se puede eliminar {record_label} porque hay registros en {label} "
            "que dependen de él. Elimine o reasigne esos registros y vuelva a intentarlo."
        )
    else:
        message = (
            f"No se puede eliminar {record_label} porque otros registros dependen de él. "
            "Revise la información relacionada antes de intentarlo de nuevo."
        )

    blocking = (
        [
            {
                "table": table,
                "label": table_label(table),
                "count": None,
                "resolution": "block",
                "cascade_delete": False,
                "message": message,
                "samples": [],
            }
        ]
        if table
        else []
    )

    return {
        "message": message,
        "details": {
            "can_delete": False,
            "source": "database",
            "blocking": blocking,
        },
    }
