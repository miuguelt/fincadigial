"""Short-lived signatures for browser access to uploaded files."""

from __future__ import annotations

import posixpath
from pathlib import PurePosixPath
from typing import Any

from flask import current_app
from itsdangerous import BadData, URLSafeTimedSerializer

_SIGNING_SALT = "villaluz-private-file-url-v1"


def normalize_upload_path(filepath: str) -> str:
    """Return a safe path relative to the upload root."""
    normalized = (filepath or "").replace("\\", "/").lstrip("/")
    if normalized.startswith("static/uploads/"):
        normalized = normalized[len("static/uploads/") :]
    normalized = posixpath.normpath(normalized)
    path = PurePosixPath(normalized)
    if not normalized or normalized in {".", ".."} or path.is_absolute() or ".." in path.parts:
        raise ValueError("La ruta del archivo no es válida")
    return normalized


def _serializer() -> URLSafeTimedSerializer:
    secret_key = current_app.secret_key or current_app.config.get("JWT_SECRET_KEY")
    if not secret_key:
        raise RuntimeError("SECRET_KEY es obligatorio para firmar archivos")
    return URLSafeTimedSerializer(secret_key, salt=_SIGNING_SALT)


def create_file_url_signature(filepath: str) -> str:
    """Create a short-lived bearer signature bound to one upload path."""
    normalized = normalize_upload_path(filepath)
    return _serializer().dumps({"path": normalized})


def verify_file_url_signature(filepath: str, signature: str | None) -> bool:
    """Verify a path-bound signature without exposing the upload root."""
    if not signature:
        return False
    try:
        normalized = normalize_upload_path(filepath)
        max_age = int(current_app.config.get("PRIVATE_FILE_URL_MAX_AGE_SECONDS", 300))
        payload: Any = _serializer().loads(signature, max_age=max_age)
        return isinstance(payload, dict) and payload.get("path") == normalized
    except (BadData, TypeError, ValueError, RuntimeError):
        return False
