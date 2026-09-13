"""Contact initiation and durable, idempotent exchange events."""
from datetime import timedelta
from sqlalchemy import or_

from app import db
from app.models.user import User
from app.services.event_service import EventService
from .access import conversation_for, is_blocked
from .models import MarketConversation, MarketEvent, MarketBlock, now
from .offers import find_offer, serialize_offer
from .conversation_view import serialize_conversation
from .transitions import transition
from .validation import MarketError, request_identity, text_field, today


def list_conversations(user_id, page=1):
    query = MarketConversation.query.filter(or_(MarketConversation.owner_id == user_id,
                                                MarketConversation.guest_id == user_id))
    result = query.order_by(MarketConversation.updated_at.desc(), MarketConversation.id.desc()).paginate(
        page=max(1, page), per_page=20, error_out=False)
    return dict(items=[serialize_conversation(t, user_id) for t in result.items],
                total=result.total, page=page, has_more=result.has_next)


def _rate_limit(user_id):
    count = MarketEvent.query.filter(MarketEvent.actor_id == user_id,
                                     MarketEvent.created_at > now() - timedelta(minutes=1)).count()
    if count >= 20:
        raise MarketError("Has enviado varios mensajes. Espera un minuto antes de continuar.", 429)


def _notify(thread, actor_id):
    recipient = thread.guest_id if actor_id == thread.owner_id else thread.owner_id
    EventService.emit_to_user(recipient, "market_exchange", {
        "type": "market_exchange", "conversation_id": thread.id,
        "title": "Tienes novedades en el mercado",
        "message": "Revisa tu conversación sobre " + thread.offer_snapshot["product_name"],
        "notification_type": "info",
        "action": {"label": "Abrir intercambio", "url": f"/campesino/market-offers?conversation={thread.id}"},
    })


def start_conversation(public_id, user, finca_id, payload, key):
    key, digest = request_identity(key, {"offer": str(public_id), **payload})
    db.session.query(User.id).filter_by(id=user.id).with_for_update().one()
    offer = find_offer(public_id, user, finca_id, lock=True)
    if offer.created_by == user.id:
        raise MarketError("Esta es tu publicación. Revisa los mensajes que recibas.", 400)
    if not offer.created_by or not offer.community_visible:
        raise MarketError("Esta publicación todavía no admite contactos.", 409)
    if is_blocked(offer.created_by, user.id):
        raise MarketError("No se puede contactar a este usuario.", 403)
    existing = MarketConversation.query.filter_by(offer_id=offer.id, guest_id=user.id).first()
    if existing:
        return serialize_conversation(existing, user.id, True)
    author = db.session.get(User, offer.created_by)
    if not author or not author.status or author.is_deleted:
        raise MarketError("El autor no está disponible.", 409)
    if offer.status != "active" or (offer.available_until and offer.available_until < today()):
        raise MarketError("La publicación ya no está disponible. Busca otra en el mercado.", 409)
    body = text_field(payload.get("message"), "message", 2000, True)
    _rate_limit(user.id)
    thread = MarketConversation(offer_id=offer.id, owner_id=offer.created_by, guest_id=user.id,
                                offer_snapshot=serialize_offer(offer, user.id))
    db.session.add(thread)
    db.session.flush()
    db.session.add(MarketEvent(conversation_id=thread.id, actor_id=user.id, kind="message",
                               body=body, request_key=key, request_hash=digest))
    db.session.commit()
    _notify(thread, user.id)
    return serialize_conversation(thread, user.id, True)


def add_event(public_id, user, payload, key):
    key, digest = request_identity(key, {"conversation": str(public_id), **payload})
    db.session.query(User.id).filter_by(id=user.id).with_for_update().one()
    thread = conversation_for(public_id, user.id, lock=True)
    existing = MarketEvent.query.filter_by(actor_id=user.id, request_key=key).first()
    if existing:
        if existing.request_hash != digest or existing.conversation_id != thread.id:
            raise MarketError("Este envío ya fue usado con otros datos.", 409)
        return serialize_conversation(thread, user.id, True)
    if is_blocked(thread.owner_id, thread.guest_id):
        raise MarketError("El contacto está bloqueado. Puedes consultar el historial.", 409)
    _rate_limit(user.id)
    kind, body = transition(thread, user.id, payload)
    if kind == "block":
        partner = thread.guest_id if user.id == thread.owner_id else thread.owner_id
        db.session.add(MarketBlock(blocker_id=user.id, blocked_id=partner))
    thread.updated_at = now()
    db.session.add(MarketEvent(conversation_id=thread.id, actor_id=user.id, kind=kind,
                               body=body, request_key=key, request_hash=digest))
    db.session.commit()
    _notify(thread, user.id)
    return serialize_conversation(thread, user.id, True)
