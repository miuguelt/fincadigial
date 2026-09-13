import pytest

from app.legal.release_guard import validate_sena_release_gate


def test_provisional_sena_mode_is_allowed_for_synthetic_data():
    validate_sena_release_gate(
        {
            "SENA_INSTITUTIONAL_MODE": "provisional_not_authorized",
            "LEGAL_RELEASE_APPROVED": False,
        }
    )


def test_institutional_sena_mode_requires_explicit_approval():
    with pytest.raises(RuntimeError, match="SENA institutional deployment blocked"):
        validate_sena_release_gate(
            {
                "SENA_INSTITUTIONAL_MODE": "production",
                "LEGAL_RELEASE_APPROVED": False,
            }
        )


def test_approved_institutional_sena_mode_is_allowed():
    validate_sena_release_gate(
        {
            "SENA_INSTITUTIONAL_MODE": "contracted",
            "LEGAL_RELEASE_APPROVED": True,
        }
    )

