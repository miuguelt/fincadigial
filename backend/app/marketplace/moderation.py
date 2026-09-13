"""Private reports and explicitly authorized community moderation."""
from app import db
from app.utils.tenant_context import is_system_admin_identity
from .models import MarketReport
from .offers import find_offer, serialize_offer
from .validation import MarketError, text_field


def can_moderate(user):
    role = getattr(user.role, "value", user.role)
    return is_system_admin_identity(role, user.identification)


def report_offer(public_id, user, finca_id, payload):
    offer = find_offer(public_id, user, finca_id, lock=True)
    reason = text_field(payload.get("reason"), "reason", 1000, True)
    if offer.created_by == user.id:
        raise MarketError("Puedes pausar o cerrar tu propia publicación.")
    report = MarketReport.query.filter_by(offer_id=offer.id, reporter_id=user.id).first()
    if not report:
        report = MarketReport(offer_id=offer.id, reporter_id=user.id, reason=reason)
        db.session.add(report)
        db.session.commit()
    return dict(id=report.id, status=report.status)


def list_reports(user):
    if not can_moderate(user):
        raise MarketError("Esta acción está reservada a la administración del sistema.", 403)
    reports = MarketReport.query.filter_by(status="open").order_by(MarketReport.created_at).limit(50).all()
    return [dict(id=r.id, reason=r.reason, offer=serialize_offer(r.offer, user.id),
                 created_at=r.created_at.isoformat() + "Z") for r in reports]


def resolve_report(public_id, user, payload):
    if not can_moderate(user):
        raise MarketError("Esta acción está reservada a la administración del sistema.", 403)
    report = MarketReport.query.filter_by(id=str(public_id)).with_for_update().first()
    if not report:
        raise MarketError("No se encontró el reporte.", 404)
    action = payload.get("action")
    if not isinstance(action, str) or action not in {"dismiss", "remove"}:
        raise MarketError("Elige descartar el reporte o retirar la publicación.")
    if report.status != "open":
        raise MarketError("Este reporte ya fue revisado. Actualiza la lista.", 409)
    report.status = "removed" if action == "remove" else "dismissed"
    if action == "remove":
        report.offer.status = "moderated"
    db.session.commit()
    return dict(id=report.id, status=report.status)
