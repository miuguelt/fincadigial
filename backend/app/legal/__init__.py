"""Legal controls that must be enforced by the application, not only by the UI."""

from .consent import (
    CURRENT_PRIVACY_NOTICE_VERSION,
    CURRENT_TERMS_VERSION,
    build_registration_consent_records,
    validate_registration_consent,
)

__all__ = [
    "CURRENT_PRIVACY_NOTICE_VERSION",
    "CURRENT_TERMS_VERSION",
    "build_registration_consent_records",
    "validate_registration_consent",
]
