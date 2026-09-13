"""Publication queries and author-owned changes using a restricted projection."""
from sqlalchemy import or_

from app import db
from app.models.market_offer import MarketOffer, MarketOfferType
from app.models.user import User
from .access import blocked_users
from .validation import MarketError, offer_payload, request_identity, require_version, today


def serialize_offer(offer, user_id):
    result = {field: getattr(offer, field) for field in (
        "product_name", "category", "quantity", "unit", "price", "currency",
        "delivery_location", "exchange_for", "notes", "community_visible",
    )}
    result.update(id=offer.public_id, offer_type=offer.offer_type.value,
                  status=offer.status, is_owner=offer.created_by == user_id,
                  author_name=offer.contact_name or "Productor de la comunidad",
                  version=offer.version_id, expired=bool(offer.available_until and offer.available_until < today()),
                  available_until=offer.available_until.isoformat() if offer.available_until else None,
                  created_at=offer.created_at.isoformat() + "Z" if offer.created_at else None,
                  can_contact=bool(offer.created_by and offer.community_visible and
                                   offer.status == "active" and
                                   (not offer.available_until or offer.available_until >= today())))
    if result["is_owner"]:
        result.update(contact_phone=offer.contact_phone, share_phone=offer.share_phone)
    return result


def find_offer(public_id, user, finca_id, lock=False):
    query = MarketOffer.query.filter_by(public_id=str(public_id), is_deleted=False)
    if lock:
        query = query.with_for_update()
    offer = query.first()
    if not offer:
        raise MarketError("Esta publicación no está disponible.", 404)
    if not offer.community_visible and offer.finca_id != finca_id:
        raise MarketError("Esta publicación no está disponible.", 404)
    return offer


def list_offers(user, finca_id, args):
    query = MarketOffer.query.filter(MarketOffer.is_deleted.is_(False))
    mine = args.get("scope") == "mine"
    if mine:
        query = query.filter(or_(MarketOffer.created_by == user.id,
                                db.and_(MarketOffer.created_by.is_(None), MarketOffer.finca_id == finca_id)))
    else:
        query = query.join(User, User.id == MarketOffer.created_by).filter(
            MarketOffer.community_visible.is_(True), MarketOffer.status == "active",
            User.status.is_(True), User.is_deleted.is_(False),
            or_(MarketOffer.available_until.is_(None), MarketOffer.available_until >= today()),
        )
        blocked = blocked_users(user.id)
        if blocked:
            query = query.filter(MarketOffer.created_by.notin_(blocked))
    kind = args.get("offer_type")
    if kind in {"sale", "purchase", "exchange"}:
        query = query.filter(MarketOffer.offer_type == MarketOfferType(kind))
    category = args.get("category")
    if category and category != "all":
        query = query.filter(MarketOffer.category == category)
    for key, fields in [("search", [MarketOffer.product_name, MarketOffer.notes, MarketOffer.exchange_for]),
                        ("location", [MarketOffer.delivery_location])]:
        term = str(args.get(key) or "").strip()[:180]
        if term:
            query = query.filter(or_(*(field.icontains(term, autoescape=True) for field in fields)))
    page = max(1, min(args.get("page", 1, type=int) or 1, 10000))
    result = query.order_by(MarketOffer.created_at.desc(), MarketOffer.id.desc()).paginate(
        page=page, per_page=18, error_out=False)
    return dict(items=[serialize_offer(o, user.id) for o in result.items],
                total=result.total, page=page, has_more=result.has_next)


def create_offer(user, finca_id, payload, key):
    key, digest = request_identity(key, payload)
    # Serialize concurrent creations for the same author, including rate checks.
    db.session.query(User.id).filter_by(id=user.id).with_for_update().one()
    existing = MarketOffer.query.filter_by(created_by=user.id, request_key=key).first()
    if existing:
        if existing.request_hash != digest:
            raise MarketError("Este envío ya se usó con otros datos.", 409)
        return serialize_offer(existing, user.id)
    data = offer_payload(payload)
    count = MarketOffer.query.filter_by(created_by=user.id, status="active", is_deleted=False).count()
    if count >= 50:
        raise MarketError("Tienes 50 publicaciones activas. Cierra las que ya no estén disponibles.", 429)
    data["offer_type"] = MarketOfferType(data["offer_type"])
    offer = MarketOffer(**data, finca_id=finca_id, created_by=user.id,
                        contact_name=user.fullname, request_key=key, request_hash=digest)
    db.session.add(offer)
    db.session.commit()
    return serialize_offer(offer, user.id)


def update_offer(public_id, user, finca_id, payload):
    offer = find_offer(public_id, user, finca_id, lock=True)
    if offer.created_by != user.id:
        raise MarketError("Solo quien publicó puede modificar esta publicación.", 403)
    require_version(offer.version_id, payload.get("version"))
    if offer.status == "moderated":
        raise MarketError("Esta publicación fue retirada por moderación.", 403)
    if "status" in payload:
        if not isinstance(payload["status"], str) or payload["status"] not in {"active", "paused", "closed"}:
            raise MarketError("Elige un estado válido.", field="status")
        if payload["status"] == "active" and (not offer.community_visible or
                                               (offer.available_until and offer.available_until < today())):
            raise MarketError("Edita la publicación, revisa la fecha y acepta compartirla antes de activarla.", 409)
        offer.status = payload["status"]
    else:
        data = offer_payload(payload)
        data["offer_type"] = MarketOfferType(data["offer_type"])
        for field, value in data.items():
            setattr(offer, field, value)
        offer.contact_name = user.fullname
    offer.updated_by = user.id
    db.session.commit()
    return serialize_offer(offer, user.id)
