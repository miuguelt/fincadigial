"""Estado liviano para degradar la API cuando la base de datos no responde."""

from __future__ import annotations

import time

DEFAULT_RETRY_AFTER_SECONDS = 10

_db_unavailable_until = 0.0
_last_error = ""


def mark_database_unavailable(
    error: object, retry_after_seconds: int = DEFAULT_RETRY_AFTER_SECONDS
) -> None:
    global _db_unavailable_until, _last_error
    _db_unavailable_until = time.monotonic() + max(1, retry_after_seconds)
    _last_error = str(error)


def mark_database_available() -> None:
    global _db_unavailable_until, _last_error
    _db_unavailable_until = 0.0
    _last_error = ""


def database_retry_after_seconds() -> int:
    remaining = int(_db_unavailable_until - time.monotonic())
    return max(0, remaining)


def is_database_temporarily_unavailable() -> bool:
    return database_retry_after_seconds() > 0


def database_unavailable_details() -> dict:
    return {
        "error": "La base de datos no esta disponible temporalmente",
        "retry_after_seconds": database_retry_after_seconds(),
        "last_error": _last_error[:300],
    }
