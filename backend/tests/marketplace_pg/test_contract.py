"""Run the same HTTP/ownership contract against PostgreSQL with rollback isolation."""
from test_marketplace import (  # noqa: F401
    test_market_requires_consent_and_valid_numbers,
    test_public_projection_and_owner_enforcement,
    test_conversation_idempotency_privacy_and_two_party_completion,
    test_paused_offer_rejects_new_contact,
    test_block_preserves_history_and_stops_contact,
    test_history_preserves_original_product_after_author_edits,
    test_revoked_membership_and_inactive_account_are_rejected,
    test_reports_are_private_and_nonadmin_cannot_moderate,
)
