"""Servicio de invitaciones — generación, validación y procesamiento de tokens."""

import logging
from datetime import datetime, UTC
from typing import Optional

from app import db
from app.models.join_request import (
    JoinRequest,
    JoinRequestStatus,
    JoinRequestType,
    InvitationMethod,
)
from app.models.user_finca import UserFinca
from app.models.finca import Finca
from app.models.user import User

logger = logging.getLogger(__name__)


from app.utils.custom_exceptions import BusinessRuleException


class InvitationError(BusinessRuleException):
    def __init__(
        self, message, status_code=400, error_code="INVITATION_ERROR", details=None
    ):
        super().__init__(
            message, status_code=status_code, error_code=error_code, details=details
        )


class InvitationService:
    @classmethod
    def create_invitation(
        cls,
        admin_user_id: int,
        finca_id: int,
        target_user: Optional[User] = None,
        target_email: Optional[str] = None,
        role: str = "Operario",
        notes: str = None,
        expires_hours: int = 72,
        method: InvitationMethod = InvitationMethod.LINK,
        max_uses: int = 1,
    ) -> tuple[JoinRequest, str]:
        finca = db.session.get(Finca, finca_id)
        if not finca:
            raise InvitationError("Finca no encontrada")

        membership = UserFinca.query.filter_by(
            user_id=admin_user_id, finca_id=finca_id
        ).first()
        if not membership:
            raise InvitationError("No tienes acceso a esta finca")

        admin_roles = {"Administrador", "Propietario", "Capataz"}
        if membership.role not in admin_roles:
            raise InvitationError("No tienes permisos para invitar usuarios")

        if target_user:
            if UserFinca.has_access(target_user.id, finca_id):
                raise InvitationError(
                    f"{target_user.fullname} ya es miembro de esta finca"
                )
            user_id = target_user.id
        elif target_email:
            existing_user = User.query.filter_by(email=target_email.lower()).first()
            if existing_user:
                if UserFinca.has_access(existing_user.id, finca_id):
                    raise InvitationError(
                        "Este email ya pertenece a un miembro de la finca"
                    )
                user_id = existing_user.id
            else:
                raise InvitationError("No existe un usuario registrado con ese email")
        else:
            raise InvitationError("Debes especificar un usuario o email destino")

        existing = JoinRequest.query.filter_by(
            user_id=user_id, finca_id=finca_id, status=JoinRequestStatus.PENDING
        ).first()
        if existing:
            raise InvitationError(
                "Ya existe una invitación pendiente para este usuario"
            )

        req, token = JoinRequest.create_invitation(
            user_id=user_id,
            finca_id=finca_id,
            role=role,
            notes=notes,
            expires_hours=expires_hours,
            method=method,
            max_uses=max_uses,
        )
        logger.info(
            f"Invitation created by user {admin_user_id} for user {user_id} to finca {finca_id}"
        )
        return req, token

    @classmethod
    def accept_invitation_by_token(
        cls, token: str, accepting_user_id: int
    ) -> JoinRequest:
        req = JoinRequest.find_by_token(token)
        if not req:
            raise InvitationError("Invitación no encontrada o ya utilizada")

        if req.is_expired():
            req.mark_expired()
            db.session.commit()
            raise InvitationError("Esta invitación ha expirado")

        if req.user_id != accepting_user_id:
            raise InvitationError("Esta invitación no es para ti")

        if UserFinca.has_access(req.user_id, req.finca_id):
            raise InvitationError("Ya eres miembro de esta finca")

        req.accept(accepting_user_id)

        UserFinca.assign(
            user_id=req.user_id,
            finca_id=req.finca_id,
            role=req.requested_role,
            commit=False,
        )
        db.session.commit()

        logger.info(f"Invitation {req.id} accepted by user {accepting_user_id}")
        return req

    @classmethod
    def process_request(
        cls, request_id: int, admin_user_id: int, approve: bool, reason: str = None
    ) -> JoinRequest:
        req = db.session.get(JoinRequest, request_id)
        if not req:
            raise InvitationError("Solicitud no encontrada")

        if req.status != JoinRequestStatus.PENDING:
            raise InvitationError("Esta solicitud ya fue procesada")

        if req.request_type == JoinRequestType.REQUEST:
            membership = UserFinca.query.filter_by(
                user_id=admin_user_id, finca_id=req.finca_id
            ).first()
            if not membership or membership.role not in {
                "Administrador",
                "Propietario",
            }:
                raise InvitationError("No tienes permisos para procesar esta solicitud")
        elif req.request_type == JoinRequestType.INVITATION:
            raise InvitationError(
                "Las invitaciones las responde el usuario invitado, no el admin"
            )

        if approve:
            req.accept(admin_user_id)
            UserFinca.assign(
                user_id=req.user_id,
                finca_id=req.finca_id,
                role=req.requested_role,
                commit=False,
            )
        else:
            req.reject(admin_user_id, reason)

        db.session.commit()
        logger.info(
            f"Request {request_id} {'approved' if approve else 'rejected'} by user {admin_user_id}"
        )
        return req

    @classmethod
    def respond_to_invitation(
        cls, request_id: int, user_id: int, approve: bool
    ) -> JoinRequest:
        req = db.session.get(JoinRequest, request_id)
        if not req:
            raise InvitationError("Invitación no encontrada")

        if req.status != JoinRequestStatus.PENDING:
            raise InvitationError("Esta invitación ya fue procesada")

        if req.request_type != JoinRequestType.INVITATION:
            raise InvitationError("Esta no es una invitación")

        if req.user_id != user_id:
            raise InvitationError("Esta invitación no es para ti")

        if req.is_expired():
            req.mark_expired()
            db.session.commit()
            raise InvitationError("Esta invitación ha expirado")

        if approve:
            if UserFinca.has_access(req.user_id, req.finca_id):
                raise InvitationError("Ya eres miembro de esta finca")
            req.accept(user_id)
            UserFinca.assign(
                user_id=req.user_id,
                finca_id=req.finca_id,
                role=req.requested_role,
                commit=False,
            )
        else:
            req.reject(user_id)

        db.session.commit()
        logger.info(
            f"Invitation {request_id} {'accepted' if approve else 'declined'} by user {user_id}"
        )
        return req

    @classmethod
    def cancel_invitation(cls, request_id: int, admin_user_id: int) -> JoinRequest:
        req = db.session.get(JoinRequest, request_id)
        if not req:
            raise InvitationError("Invitación no encontrada")

        if req.status != JoinRequestStatus.PENDING:
            raise InvitationError("Esta invitación ya fue procesada")

        membership = UserFinca.query.filter_by(
            user_id=admin_user_id, finca_id=req.finca_id
        ).first()
        if not membership or membership.role not in {"Administrador", "Propietario"}:
            raise InvitationError("No tienes permisos para cancelar esta invitación")

        req.cancel(admin_user_id)
        db.session.commit()
        logger.info(f"Invitation {request_id} cancelled by user {admin_user_id}")
        return req

    @classmethod
    def expire_old_invitations(cls) -> int:
        expired = JoinRequest.query.filter(
            JoinRequest.status == JoinRequestStatus.PENDING,
            JoinRequest.expires_at.isnot(None),
            JoinRequest.expires_at < datetime.now(UTC),
        ).all()

        count = 0
        for req in expired:
            req.mark_expired()
            count += 1

        if count > 0:
            db.session.commit()
            logger.info(f"Expired {count} old invitations")
        return count

    @classmethod
    def get_invitation_url(cls, token: str, base_url: str = None) -> str:
        base = base_url or "https://villaluz.app"
        return f"{base}/invite/{token}"

    @classmethod
    def generate_qr_data(cls, token: str, base_url: str = None) -> str:
        return cls.get_invitation_url(token, base_url)
