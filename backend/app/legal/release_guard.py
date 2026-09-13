"""Guards that prevent an unapproved institutional SENA deployment."""


AUTHORIZED_MODES = {"contracted", "production"}


def validate_sena_release_gate(config) -> None:
    """Fail closed for institutional/production mode without approval evidence.

    The provisional mode is intentionally allowed for synthetic data and review.
    Production approval is an external legal/institutional fact and therefore is
    supplied explicitly by the deployment environment after the SENA gate closes.
    """

    mode = str(config.get("SENA_INSTITUTIONAL_MODE", "provisional_not_authorized"))
    approved = config.get("LEGAL_RELEASE_APPROVED", False) is True
    if mode in AUTHORIZED_MODES and not approved:
        raise RuntimeError(
            "SENA institutional deployment blocked: set LEGAL_RELEASE_APPROVED=true "
            "only after the approved contract, privacy, security, archive and pilot "
            "evidence is recorded in the compliance manifest."
        )


def data_collection_allowed(config) -> bool:
    """Return whether this runtime may accept real registration data.

    Development/testing can use synthetic fixtures. Any non-local deployment
    requires an authorized institutional mode, explicit approval and the data
    collection switch, so a mistaken environment variable cannot turn a
    provisional VPS into a live intake point.
    """

    if not bool(config.get("DATA_COLLECTION_ENABLED", False)):
        return False

    config_name = str(config.get("CONFIG_NAME", "")).lower()
    if config_name in {"development", "testing"}:
        return True

    mode = str(config.get("SENA_INSTITUTIONAL_MODE", "")).strip().lower()
    approved = config.get("LEGAL_RELEASE_APPROVED", False) is True
    return approved and mode in AUTHORIZED_MODES
