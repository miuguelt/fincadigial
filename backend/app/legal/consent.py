"""Server-side consent contract for public account creation."""

from __future__ import annotations

from datetime import UTC, datetime
import hashlib
from typing import Any

CURRENT_PRIVACY_NOTICE_VERSION = "2026-09-10"
CURRENT_TERMS_VERSION = "2026-09-10"


def _text_hash(purpose: str, version: str) -> str:
    """Identify the legal artifact version without storing its full text."""
    material = f"villaluz:{purpose}:{version}".encode("utf-8")
    return hashlib.sha256(material).hexdigest()


def validate_registration_consent(consent: Any) -> dict[str, str]:
    """Validate the mandatory legal acceptances for public registration."""
    errors: dict[str, str] = {}
    if not isinstance(consent, dict):
        return {"consent": "Debe aceptar el aviso de privacidad y los términos de uso."}

    if consent.get("privacy_notice_accepted") is not True:
        errors["consent.privacy_notice_accepted"] = (
            "Debe aceptar el aviso de privacidad."
        )
    if consent.get("terms_accepted") is not True:
        errors["consent.terms_accepted"] = "Debe aceptar los términos de uso."
    if consent.get("privacy_notice_version") != CURRENT_PRIVACY_NOTICE_VERSION:
        errors["consent.privacy_notice_version"] = (
            "La versión del aviso de privacidad no está vigente."
        )
    if consent.get("terms_version") != CURRENT_TERMS_VERSION:
        errors["consent.terms_version"] = "La versión de los términos no está vigente."
    return errors


def build_registration_consent_records(consent: dict[str, Any], source: str) -> list[dict[str, Any]]:
    """Build immutable evidence rows from a validated public registration payload."""
    accepted_at = datetime.now(UTC)
    return [
        {
            "purpose": "privacy_notice",
            "version": CURRENT_PRIVACY_NOTICE_VERSION,
            "consent_text_hash": _text_hash(
                "privacy_notice", CURRENT_PRIVACY_NOTICE_VERSION
            ),
            "accepted_at": accepted_at,
            "source": source,
        },
        {
            "purpose": "terms_of_use",
            "version": CURRENT_TERMS_VERSION,
            "consent_text_hash": _text_hash("terms_of_use", CURRENT_TERMS_VERSION),
            "accepted_at": accepted_at,
            "source": source,
        },
    ]
