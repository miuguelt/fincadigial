"""Servicio del feed de notificaciones del usuario (solicitudes e invitaciones)."""

import logging

from app import db
from app.models.join_request import JoinRequest, JoinRequestStatus, JoinRequestType
from app.models.user_finca import UserFinca
from app.services.invitation_service import InvitationService, InvitationError

logger = logging.getLogger(__name__)

ADMIN_ROLES = ('Administrador', 'Propietario', 'Capataz')

_STATUS_MAP = {
    JoinRequestStatus.PENDING: 'pending',
    JoinRequestStatus.APPROVED: 'approved',
    JoinRequestStatus.REJECTED: 'rejected',
    JoinRequestStatus.EXPIRED: 'rejected',
    JoinRequestStatus.CANCELLED: 'rejected',
}


class NotificationFeedService:
    """Proyecta JoinRequest como notificaciones para el usuario autenticado."""

    @classmethod
    def _admin_finca_ids(cls, user_id: int) -> list[int]:
        memberships = UserFinca.query.filter_by(user_id=user_id).filter(
            UserFinca.role.in_(ADMIN_ROLES)
        ).all()
        return [m.finca_id for m in memberships]

    @classmethod
    def _serialize(cls, req: JoinRequest, notification_type: str) -> dict:
        return {
            'id': req.id,
            'type': notification_type,
            'finca_id': req.finca_id,
            'finca_name': req.finca.name if req.finca else None,
            'sender_id': req.user_id,
            'sender_name': req.user.fullname if req.user else None,
            'requested_role': req.requested_role,
            'created_at': req.created_at.isoformat() if req.created_at else None,
            'status': _STATUS_MAP.get(req.status, 'pending'),
            'metadata': {
                'request_type': req.request_type.value,
                'notes': req.notes,
                'expires_at': req.expires_at.isoformat() if req.expires_at else None,
                'is_expired': req.is_expired(),
            },
        }

    @classmethod
    def list_for_user(cls, user_id: int, status: str | None = None) -> list[dict]:
        """Solicitudes recibidas como admin + invitaciones dirigidas al usuario."""
        query_status = None
        if status:
            query_status = next(
                (k for k, v in _STATUS_MAP.items() if v == status), None
            )
            if query_status is None:
                raise InvitationError(f"Estado no soportado: {status}")

        items: list[dict] = []

        admin_finca_ids = cls._admin_finca_ids(user_id)
        if admin_finca_ids:
            requests_q = JoinRequest.query.filter(
                JoinRequest.finca_id.in_(admin_finca_ids),
                JoinRequest.request_type == JoinRequestType.REQUEST,
            )
            if query_status is not None:
                requests_q = requests_q.filter(JoinRequest.status == query_status)
            items.extend(
                cls._serialize(r, 'JOIN_REQUEST')
                for r in requests_q.order_by(JoinRequest.created_at.desc()).all()
            )

        invitations_q = JoinRequest.query.filter(
            JoinRequest.user_id == user_id,
            JoinRequest.request_type == JoinRequestType.INVITATION,
        )
        if query_status is not None:
            invitations_q = invitations_q.filter(JoinRequest.status == query_status)
        items.extend(
            cls._serialize(r, 'INVITATION_RECEIVED')
            for r in invitations_q.order_by(JoinRequest.created_at.desc()).all()
        )

        items.sort(key=lambda i: i['created_at'] or '', reverse=True)
        return items

    @classmethod
    def apply_action(cls, notification_id: int, user_id: int, action: str) -> dict:
        """Aprueba, rechaza o marca como leída una notificación."""
        req = db.session.get(JoinRequest, notification_id)
        if not req:
            raise InvitationError("Notificación no encontrada", status_code=404)

        if not cls._is_visible_to(req, user_id):
            raise InvitationError("Notificación no encontrada", status_code=404)

        if action == 'read':
            # No existe estado "leído" persistido: se acusa recibo sin mutar la fila.
            return cls._serialize(req, cls._type_of(req))

        if action not in ('approve', 'reject'):
            raise InvitationError(f"Acción no soportada: {action}")

        approve = action == 'approve'
        if req.request_type == JoinRequestType.INVITATION:
            req = InvitationService.respond_to_invitation(req.id, user_id, approve)
        else:
            req = InvitationService.process_request(req.id, user_id, approve)

        return cls._serialize(req, cls._type_of(req))

    @classmethod
    def _type_of(cls, req: JoinRequest) -> str:
        return (
            'INVITATION_RECEIVED'
            if req.request_type == JoinRequestType.INVITATION
            else 'JOIN_REQUEST'
        )

    @classmethod
    def _is_visible_to(cls, req: JoinRequest, user_id: int) -> bool:
        if req.request_type == JoinRequestType.INVITATION:
            return req.user_id == user_id
        return req.finca_id in cls._admin_finca_ids(user_id)
