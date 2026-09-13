"""Authorization for the public projection and private market participants."""
from flask_jwt_extended import get_jwt_identity
from sqlalchemy import or_, and_

from app import db
from app.models.user import User
from app.models.user_finca import UserFinca
from app.models.finca import Finca
from app.utils.tenant_context import get_current_finca_id
from .models import MarketBlock, MarketConversation
from .validation import MarketError


def context():
    try:
        identity = int(get_jwt_identity())
    except (TypeError, ValueError):
        raise MarketError("Inicia sesión para usar el mercado.", 401)
    user = db.session.get(User, identity)
    finca_id = get_current_finca_id()
    if not user or not user.status or user.is_deleted:
        raise MarketError("Tu cuenta no está habilitada para el mercado.", 403)
    approval = getattr(user.approval_status, "value", user.approval_status)
    if str(approval).lower() != "approved":
        raise MarketError("Tu cuenta debe estar aprobada para usar el mercado.", 403)
    membership = UserFinca.query.filter_by(user_id=identity, finca_id=finca_id).first()
    permitted = membership.is_active if membership else user.finca_id == finca_id
    finca = db.session.get(Finca, finca_id) if finca_id else None
    if not finca or not finca.is_active or not permitted:
        raise MarketError("Selecciona una finca a la que pertenezcas activamente.", 403)
    return user, finca_id


def blocked_users(user_id):
    rows = MarketBlock.query.filter(or_(MarketBlock.blocker_id == user_id,
                                       MarketBlock.blocked_id == user_id)).all()
    return {r.blocked_id if r.blocker_id == user_id else r.blocker_id for r in rows}


def is_blocked(first, second):
    return MarketBlock.query.filter(or_(
        and_(MarketBlock.blocker_id == first, MarketBlock.blocked_id == second),
        and_(MarketBlock.blocker_id == second, MarketBlock.blocked_id == first),
    )).first() is not None


def conversation_for(public_id, user_id, lock=False):
    query = MarketConversation.query.filter(
        MarketConversation.id == str(public_id),
        or_(MarketConversation.owner_id == user_id, MarketConversation.guest_id == user_id),
    )
    if lock:
        query = query.with_for_update()
    item = query.first()
    if not item:
        raise MarketError("No se encontró esta conversación.", 404)
    return item
