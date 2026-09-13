"""Helpers for keeping browser authentication tokens out of JSON responses.

The API still supports bearer tokens for explicitly configured non-browser
clients.  Institutional web deployments can enable ``AUTH_COOKIE_ONLY`` so
that the access and refresh JWTs are delivered only as HttpOnly cookies.
"""

from __future__ import annotations

from typing import Any

from flask import current_app


def cookie_only_auth_enabled() -> bool:
    """Return whether browser responses must omit bearer tokens."""

    return bool(current_app.config.get("AUTH_COOKIE_ONLY", False))


def sanitize_auth_response_data(data: dict[str, Any]) -> dict[str, Any]:
    """Remove token material from a JSON response in cookie-only mode."""

    sanitized = dict(data)
    if cookie_only_auth_enabled():
        sanitized.pop("access_token", None)
        sanitized.pop("refresh_token", None)
        sanitized.pop("token_type", None)
    return sanitized
