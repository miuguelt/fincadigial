from flask_restx import Namespace, Resource, fields
import flask
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.join_request import (
    JoinRequest,
    JoinRequestStatus,
    JoinRequestType,
    InvitationMethod,
)
from app.models.user_finca import UserFinca
from app.models.user import User
from app.models.finca import Finca
from app.utils.response_handler import APIResponse
from app.services.invitation_service import InvitationService, InvitationError
from app.services.push_notification_service import PushNotificationService

import logging

logger = logging.getLogger(__name__)

invitations_ns = Namespace(
    "invitations", description="📨 Sistema de Invitaciones con Tokens"
)

invite_model = invitations_ns.model(
    "CreateInvitation",
    {
        "finca_id": fields.Integer(required=True, description="ID de la finca"),
        "user_id": fields.Integer(description="ID del usuario existente"),
        "email": fields.String(description="Email del usuario destino"),
        "role": fields.String(description="Rol asignado", default="Operario"),
        "notes": fields.String(description="Mensaje personalizado"),
        "expires_hours": fields.Integer(description="Horas de expiración", default=72),
        "method": fields.String(
            description="Método de envío", enum=["email", "link", "qr", "code"]
        ),
        "max_uses": fields.Integer(description="Usos máximos del token", default=1),
    },
)

token_accept_model = invitations_ns.model(
    "AcceptByToken",
    {
        "token": fields.String(required=True, description="Token de invitación"),
    },
)

respond_model = invitations_ns.model(
    "RespondToInvitation",
    {
        "approve": fields.Boolean(required=True, description="Aceptar o rechazar"),
    },
)


@invitations_ns.route("/create")
class CreateInvitation(Resource):
    @invitations_ns.doc("create_invitation", security=["Bearer"])
    @invitations_ns.expect(invite_model)
    @jwt_required()
    def post(self):
        data = flask.request.get_json() or {}
        current_user_id = get_jwt_identity()
        finca_id = data.get("finca_id")
        user_id = data.get("user_id")
        email = data.get("email")
        role = data.get("role", "Operario")
        notes = data.get("notes")
        expires_hours = data.get("expires_hours", 72)
        method_str = data.get("method", "link")
        max_uses = data.get("max_uses", 1)

        if not finca_id:
            return APIResponse.validation_error({"finca_id": "Requerido"})

        try:
            method = InvitationMethod(method_str)
        except ValueError:
            return APIResponse.validation_error({"method": "Método inválido"})

        target_user = None
        if user_id:
            target_user = db.session.get(User, user_id)
            if not target_user:
                return APIResponse.error("Usuario no encontrado", status_code=404)

        req, token = InvitationService.create_invitation(
            admin_user_id=current_user_id,
            finca_id=finca_id,
            target_user=target_user,
            target_email=email,
            role=role,
            notes=notes,
            expires_hours=expires_hours,
            method=method,
            max_uses=max_uses,
        )

        invitation_url = InvitationService.get_invitation_url(token)
        qr_data = InvitationService.generate_qr_data(token)

        try:
            target = target_user or (
                User.query.filter_by(email=email).first() if email else None
            )
            if target:
                PushNotificationService.send_to_user(
                    user_id=target.id,
                    title="Nueva Invitación",
                    body=f"Has sido invitado a unirte a una finca como {role}.",
                    data={
                        "type": "invitation",
                        "request_id": req.id,
                        "url": f"/invite/{token}",
                    },
                )
        except Exception as e:
            logger.warning(f"No se pudo enviar notificación: {e}")

        return APIResponse.created(
            data={
                "id": req.id,
                "token": token,
                "url": invitation_url,
                "qr_data": qr_data,
                "expires_at": req.expires_at.isoformat() if req.expires_at else None,
                "method": method.value,
            },
            message="Invitación creada correctamente",
        )


@invitations_ns.route("/accept")
class AcceptByToken(Resource):
    @invitations_ns.doc("accept_by_token", security=["Bearer"])
    @invitations_ns.expect(token_accept_model)
    @jwt_required()
    def post(self):
        data = flask.request.get_json() or {}
        token = data.get("token")
        if not token:
            return APIResponse.validation_error({"token": "Requerido"})

        current_user_id = get_jwt_identity()

        req = InvitationService.accept_invitation_by_token(token, current_user_id)

        return APIResponse.success(
            data={
                "finca_id": req.finca_id,
                "finca_name": req.finca.name if req.finca else None,
                "role": req.requested_role,
            },
            message="¡Bien! Te has unido a la finca exitosamente",
        )


@invitations_ns.route("/<int:request_id>/respond")
class RespondToInvitation(Resource):
    @invitations_ns.doc("respond_to_invitation", security=["Bearer"])
    @invitations_ns.expect(respond_model)
    @jwt_required()
    def post(self, request_id):
        data = flask.request.get_json() or {}
        approve = data.get("approve", False)
        current_user_id = get_jwt_identity()

        req = InvitationService.respond_to_invitation(
            request_id, current_user_id, approve
        )

        action = "aceptada" if approve else "rechazada"
        return APIResponse.success(message=f"Invitación {action} correctamente")


@invitations_ns.route("/<int:request_id>/cancel")
class CancelInvitation(Resource):
    @invitations_ns.doc("cancel_invitation", security=["Bearer"])
    @jwt_required()
    def post(self, request_id):
        current_user_id = get_jwt_identity()

        req = InvitationService.cancel_invitation(request_id, current_user_id)

        return APIResponse.success(message="Invitación cancelada correctamente")


@invitations_ns.route("/farms/search")
class FarmSearchResource(Resource):
    @invitations_ns.doc(
        "search_farms",
        description="Buscar fincas por nombre para solicitar unirse",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        try:
            q = flask.request.args.get("q", "")
            if len(q) < 3:
                return APIResponse.success(data=[])

            farms = Finca.query.filter(Finca.name.ilike(f"%{q}%")).limit(10).all()
            return APIResponse.success(
                data=[
                    {
                        "id": f.id,
                        "name": f.name,
                        "type": f.type.value if f.type else None,
                        "logo_url": f.logo_url,
                    }
                    for f in farms
                ]
            )
        except Exception as e:
            return APIResponse.error(str(e))


@invitations_ns.route("/request-join")
class RequestJoinFarm(Resource):
    @invitations_ns.doc("request_join_farm", security=["Bearer"])
    @invitations_ns.expect(respond_model)  # Usar respond_model o similar para mensaje
    @jwt_required()
    def post(self):
        """Usuario solicita unirse a una finca"""
        try:
            data = flask.request.get_json()
            current_user_id = get_jwt_identity()
            farm_id = data.get("finca_id")

            # Validar si ya es miembro
            existing = UserFinca.query.filter_by(
                user_id=current_user_id, finca_id=farm_id
            ).first()
            if existing:
                return APIResponse.validation_error(
                    {"finca_id": "Ya eres miembro de esta finca"}
                )

            # Validar solicitud pendiente
            pending = JoinRequest.query.filter_by(
                user_id=current_user_id,
                finca_id=farm_id,
                request_type=JoinRequestType.REQUEST,
                status=JoinRequestStatus.PENDING,
            ).first()

            if pending:
                return APIResponse.validation_error(
                    {"finca_id": "Ya tienes una solicitud pendiente para esta finca"}
                )

            req = JoinRequest(
                user_id=current_user_id,
                finca_id=farm_id,
                request_type=JoinRequestType.REQUEST,
                status=JoinRequestStatus.PENDING,
                notes=data.get("message"),
            )
            db.session.add(req)
            db.session.commit()

            return APIResponse.created(req.to_dict(), message="Solicitud enviada")
        except Exception as e:
            db.session.rollback()
            return APIResponse.error(str(e))


@invitations_ns.route("/pending")
class PendingInvitations(Resource):
    @invitations_ns.doc("list_pending_invitations", security=["Bearer"])
    @jwt_required()
    def get(self):
        current_user_id = get_jwt_identity()

        admin_memberships = (
            UserFinca.query.filter_by(user_id=current_user_id)
            .filter(UserFinca.role.in_(["Administrador", "Propietario", "Capataz"]))
            .all()
        )
        admin_finca_ids = [m.finca_id for m in admin_memberships]

        sent_invitations = []
        if admin_finca_ids:
            sent = JoinRequest.query.filter(
                JoinRequest.finca_id.in_(admin_finca_ids),
                JoinRequest.request_type == JoinRequestType.INVITATION,
                JoinRequest.status == JoinRequestStatus.PENDING,
            ).all()
            sent_invitations = [r.to_dict() for r in sent]

        received = JoinRequest.query.filter_by(
            user_id=current_user_id,
            request_type=JoinRequestType.INVITATION,
            status=JoinRequestStatus.PENDING,
        ).all()
        received_invitations = [r.to_dict() for r in received]

        return APIResponse.success(
            data={
                "sent": sent_invitations,
                "received": received_invitations,
            }
        )


@invitations_ns.route("/<string:token>/validate")
class ValidateToken(Resource):
    @invitations_ns.doc("validate_token")
    def get(self, token):
        req = JoinRequest.find_by_token(token)
        if not req:
            return APIResponse.success(data={"valid": False, "reason": "not_found"})

        if req.is_expired():
            req.mark_expired()
            db.session.commit()
            return APIResponse.success(data={"valid": False, "reason": "expired"})

        return APIResponse.success(
            data={
                "valid": True,
                "finca_name": req.finca.name if req.finca else None,
                "role": req.requested_role,
                "expires_at": req.expires_at.isoformat() if req.expires_at else None,
                "inviter": req.finca.name if req.finca else None,
            }
        )
