"""Bounded participant-only conversation and timeline projections."""
from sqlalchemy import or_, and_
from .models import MarketEvent
from .access import is_blocked


def serialize_conversation(thread, user_id, include_events=False, before=None):
    owner = thread.owner_id == user_id
    partner = thread.guest if owner else thread.owner
    last = MarketEvent.query.filter_by(conversation_id=thread.id).order_by(
        MarketEvent.created_at.desc(), MarketEvent.id.desc()).first()
    blocked = is_blocked(thread.owner_id, thread.guest_id)
    result = dict(id=thread.id, status=thread.status, version=thread.version,
                  partner_name=partner.fullname if partner else "Usuario",
                  is_owner=owner, offer={**thread.offer_snapshot, "is_owner": owner},
                  terms=thread.terms, proposal_is_mine=thread.proposal_by == user_id,
                  my_confirmation=thread.owner_confirmed if owner else thread.guest_confirmed,
                  partner_confirmation=thread.guest_confirmed if owner else thread.owner_confirmed,
                  blocked=blocked, needs_reply=bool(last and last.actor_id != user_id and
                                                   thread.status not in {"completed", "cancelled", "blocked"}),
                  updated_at=thread.updated_at.isoformat() + "Z")
    if not owner and thread.offer.share_phone and not blocked:
        result["contact_phone"] = thread.offer.contact_phone
    if include_events:
        query = MarketEvent.query.filter_by(conversation_id=thread.id)
        if before:
            cursor = query.filter_by(id=before).first()
            if cursor:
                query = query.filter(or_(MarketEvent.created_at < cursor.created_at,
                                         and_(MarketEvent.created_at == cursor.created_at, MarketEvent.id < cursor.id)))
        events = query.order_by(MarketEvent.created_at.desc(), MarketEvent.id.desc()).limit(51).all()
        result["has_more"] = len(events) > 50
        result["events"] = [dict(id=e.id, kind=e.kind, body=e.body, is_mine=e.actor_id == user_id,
                                 created_at=e.created_at.isoformat() + "Z") for e in reversed(events[:50])]
    return result
