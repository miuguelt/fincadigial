from datetime import timedelta
from types import SimpleNamespace
import pytest
from app.marketplace.validation import MarketError, offer_payload, today, require_version
from app.marketplace.transitions import transition


def valid_payload(**changes):
    return {"product_name": "Yuca", "offer_type": "sale", "quantity": 2, "unit": "kg",
            "delivery_location": "Vélez", "community_visible": True, **changes}


@pytest.mark.parametrize("field,value", [
    ("product_name", "   "), ("product_name", "x" * 181), ("product_name", []),
    ("quantity", 0), ("quantity", -1), ("quantity", True), ("quantity", "NaN"), ("quantity", "Infinity"),
    ("price", -2), ("price", "NaN"), ("price", 1e13), ("unit", ""),
    ("offer_type", []), ("offer_type", "donation"), ("category", []), ("category", "invalid"),
    ("community_visible", "true"), ("community_visible", False),
    ("contact_phone", "javascript:example"), ("contact_phone", "123"),
    ("share_phone", "true"), ("available_until", "2020-01-01"), ("available_until", 123),
])
def test_invalid_publications_have_field_errors(field, value):
    with pytest.raises(MarketError) as caught:
        offer_payload(valid_payload(**{field: value}))
    assert caught.value.status == 400
    assert caught.value.field == field


def test_expiry_default_and_phone_consent():
    result = offer_payload(valid_payload(contact_phone="+57 300 123 4567"))
    assert result["available_until"] == today() + timedelta(days=30)
    assert result["contact_phone"] == "3001234567"
    assert result["share_phone"] is False


def test_exchange_requires_specific_requested_goods_and_clears_money():
    with pytest.raises(MarketError):
        offer_payload(valid_payload(offer_type="exchange"))
    result = offer_payload(valid_payload(offer_type="exchange", exchange_for="Huevos", price=5000))
    assert result["exchange_for"] == "Huevos" and result["price"] is None


@pytest.mark.parametrize("version", [None, "1", True, 0, 2])
def test_stale_or_invalid_version_is_conflict(version):
    with pytest.raises(MarketError) as caught:
        require_version(1, version)
    assert caught.value.status == 409


@pytest.mark.parametrize("status,kind", [("completed", "message"), ("cancelled", "proposal"),
    ("blocked", "message"), ("talking", "complete"), ("talking", "accept"), ("agreed", "proposal")])
def test_invalid_transitions_preserve_status(status, kind):
    thread = SimpleNamespace(status=status, version=1, proposal_by=2)
    with pytest.raises(MarketError):
        transition(thread, 1, {"kind": kind, "body": "Condiciones", "version": 1})
    assert thread.status == status


def test_only_other_person_can_accept_and_both_must_confirm():
    thread = SimpleNamespace(status="proposed", version=1, proposal_by=1, owner_id=1,
                             owner_confirmed=False, guest_confirmed=False)
    with pytest.raises(MarketError):
        transition(thread, 1, {"kind": "accept", "version": 1})
    transition(thread, 2, {"kind": "accept", "version": 1})
    transition(thread, 1, {"kind": "complete", "version": 1})
    assert thread.status == "agreed"
    transition(thread, 2, {"kind": "complete", "version": 1})
    assert thread.status == "completed"
