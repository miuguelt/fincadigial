from flask_restx import Namespace, Resource, fields
import flask
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user_finca import UserFinca
from app.models.join_request import JoinRequest, JoinRequestStatus, JoinRequestType
from app.models.finca import Finca
from app.models.user import User
from app.utils.response_handler import APIResponse
from app.services.push_notification_service import PushNotificationService
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)

membership_ns = Namespace('users/membership', description='👥 Gestión de Membresía Multi-Finca')

# Modelos para Swagger
request_model = membership_ns.model('MembershipRequestAction', {
    'finca_id': fields.Integer(required=True, description='ID de la finca'),
    'user_id': fields.Integer(required=False, description='ID del usuario (para invitaciones)'),
    'requested_role': fields.String(description='Rol propuesto/solicitado'),
    'notes': fields.String(description='Notas adicionales o mensaje')
})

respond_model = membership_ns.model('MembershipResponse', {
    'approve': fields.Boolean(required=True, description='Aprobar o rechazar')
})

@membership_ns.route('/requests')
class JoinRequestCollection(Resource):
    @membership_ns.doc('create_membership_gestion', security=['Bearer'])
    @membership_ns.expect(request_model)
    @jwt_required()
    def post(self):
        """Enviar una solicitud (User->Finca) o una invitación (Finca->User)"""
        try:
            current_user_id = get_jwt_identity()
            data = flask.request.get_json() or {}
            finca_id = data.get('finca_id')
            target_user_id = data.get('user_id')
            role = data.get('requested_role', 'Operario')
            notes = data.get('notes') or data.get('message')

            if not finca_id:
                return APIResponse.validation_error({'finca_id': 'Requerido'})

            finca = db.session.get(Finca, finca_id)
            if not finca:
                return APIResponse.error("Finca no encontrada", status_code=404)

            # --- CASO 1: INVITACIÓN (Finca Admin -> Usuario) ---
            if target_user_id:
                # Verificar que el remitente sea administrador de esa finca
                admin_membership = UserFinca.query.filter_by(
                    user_id=current_user_id, 
                    finca_id=finca_id, 
                    role='Administrador'
                ).first()
                
                if not admin_membership:
                    return APIResponse.error("No tienes permisos para invitar usuarios a esta finca", status_code=403)
                
                target_user = db.session.get(User, target_user_id)
                if not target_user:
                    return APIResponse.error("Usuario destino no encontrado", status_code=404)

                if UserFinca.has_access(target_user_id, finca_id):
                    return APIResponse.error(f"{target_user.fullname} ya es miembro de esta finca", status_code=400)

                # Verificar si ya existe una invitación/solicitud pendiente
                existing = JoinRequest.query.filter_by(
                    user_id=target_user_id,
                    finca_id=finca_id,
                    status=JoinRequestStatus.PENDING
                ).first()
                if existing:
                    return APIResponse.error("Ya existe una gestión pendiente para este usuario", status_code=400)

                req = JoinRequest(
                    user_id=target_user_id, 
                    finca_id=finca_id, 
                    request_type=JoinRequestType.INVITATION, 
                    requested_role=role, 
                    notes=notes
                )
                db.session.add(req)
                db.session.commit()

                # Notificar al usuario invitado
                try:
                    PushNotificationService.send_to_user(
                        user_id=target_user_id,
                        title='Nueva Invitación',
                        body=f'La finca {finca.name} te ha invitado a unirte como {role}.',
                        data={'type': 'membership_invitation', 'request_id': req.id, 'url': '/dashboard/membership'}
                    )
                except Exception as e:
                    logger.warning(f"No se pudo enviar notificación de invitación: {e}")

                return APIResponse.success(message="Invitación enviada correctamente")

            # --- CASO 2: SOLICITUD (Usuario -> Finca) ---
            else:
                if UserFinca.has_access(current_user_id, finca_id):
                    return APIResponse.error("Ya eres miembro de esta finca", status_code=400)

                # Verificar si ya existe una solicitud/invitación pendiente
                existing = JoinRequest.query.filter_by(
                    user_id=current_user_id,
                    finca_id=finca_id,
                    status=JoinRequestStatus.PENDING
                ).first()
                if existing:
                    return APIResponse.error("Ya tienes una solicitud pendiente para esta finca", status_code=400)

                req = JoinRequest(
                    user_id=current_user_id, 
                    finca_id=finca_id, 
                    request_type=JoinRequestType.REQUEST, 
                    requested_role=role, 
                    notes=notes
                )
                db.session.add(req)
                db.session.commit()

                # Notificar a los administradores de la finca
                try:
                    user = db.session.get(User, current_user_id)
                    PushNotificationService.send_membership_request_notification(
                        request_id=req.id,
                        finca_id=finca_id,
                        user_name=user.fullname if user else "Un usuario"
                    )
                except Exception as e:
                    logger.warning(f"No se pudo enviar notificación de solicitud: {e}")

                return APIResponse.success(message="Solicitud enviada correctamente")

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error en creación de gestión de membresía: {e}")
            return APIResponse.error("Error al procesar la solicitud", details={'error': str(e)}, status_code=500)

@membership_ns.route('/requests/pending')
class PendingRequests(Resource):
    @membership_ns.doc('get_pending_gestions', security=['Bearer'])
    @jwt_required()
    def get(self):
        """Listar gestiones pendientes (Solicitudes que debo aprobar e Invitaciones que he recibido)"""
        try:
            user_id = get_jwt_identity()
            
            # 1. Fincas donde soy administrador
            admin_memberships = UserFinca.query.filter_by(user_id=user_id, role='Administrador').all()
            managed_finca_ids = [m.finca_id for m in admin_memberships]

            # 2. Solicitudes entrantes para esas fincas
            incoming = JoinRequest.query.filter(
                JoinRequest.finca_id.in_(managed_finca_ids), 
                JoinRequest.request_type == JoinRequestType.REQUEST, 
                JoinRequest.status == JoinRequestStatus.PENDING
            ).all() if managed_finca_ids else []
            
            # 3. Invitaciones recibidas por mí
            my_invites = JoinRequest.query.filter_by(
                user_id=user_id, 
                request_type=JoinRequestType.INVITATION, 
                status=JoinRequestStatus.PENDING
            ).all()

            return APIResponse.success(data={
                'requests_to_approve': [r.to_dict() for r in incoming],
                'invitations_received': [r.to_dict() for r in my_invites]
            })
        except Exception as e:
            logger.error(f"Error listando gestiones pendientes: {e}")
            return APIResponse.error("Error al obtener datos")

@membership_ns.route('/requests/<int:request_id>/respond')
class RespondRequest(Resource):
    @membership_ns.doc('respond_membership_request', security=['Bearer'])
    @membership_ns.expect(respond_model)
    @jwt_required()
    def post(self, request_id):
        """Aprobar o Rechazar una solicitud/invitación"""
        try:
            current_user_id = get_jwt_identity()
            data = flask.request.get_json() or {}
            approve = data.get('approve', False)

            req = db.session.get(JoinRequest, request_id)
            if not req: 
                return APIResponse.error("Gestión no encontrada", status_code=404)

            if req.status != JoinRequestStatus.PENDING:
                return APIResponse.error("Esta gestión ya ha sido procesada", status_code=400)

            # Validar permisos de respuesta
            if req.request_type == JoinRequestType.REQUEST:
                # Es una solicitud de usuario -> Finca. Solo el admin de la finca puede responder.
                admin_membership = UserFinca.query.filter_by(
                    user_id=current_user_id, 
                    finca_id=req.finca_id, 
                    role='Administrador'
                ).first()
                if not admin_membership:
                    return APIResponse.error("No tienes permisos para aprobar solicitudes en esta finca", status_code=403)
            else:
                # Es una invitación Finca -> Usuario. Solo el usuario invitado puede responder.
                if req.user_id != current_user_id: 
                    return APIResponse.error("No puedes responder a una invitación que no es para ti", status_code=403)

            # Actualizar estado
            req.status = JoinRequestStatus.APPROVED if approve else JoinRequestStatus.REJECTED
            req.processed_at = datetime.now(timezone.utc)
            req.processed_by = current_user_id

            if approve:
                # Asignar a la finca
                UserFinca.assign(
                    user_id=req.user_id, 
                    finca_id=req.finca_id, 
                    role=req.requested_role, 
                    commit=False
                )
                
                # Si era una solicitud de usuario, notificar al usuario que fue aceptado
                if req.request_type == JoinRequestType.REQUEST:
                    try:
                        PushNotificationService.send_to_user(
                            user_id=req.user_id,
                            title='Solicitud Aprobada',
                            body=f'Has sido aceptado en la finca {req.finca.name}.',
                            data={'type': 'membership_approved', 'finca_id': req.finca_id, 'url': '/dashboard'}
                        )
                    except Exception: pass
            else:
                # Si fue rechazada, notificar según corresponda
                if req.request_type == JoinRequestType.REQUEST:
                    try:
                        PushNotificationService.send_to_user(
                            user_id=req.user_id,
                            title='Solicitud Rechazada',
                            body=f'Tu solicitud para unirte a {req.finca.name} ha sido declinada.',
                            data={'type': 'membership_rejected', 'finca_id': req.finca_id}
                        )
                    except Exception: pass

            db.session.commit()
            return APIResponse.success(message="Gestión procesada exitosamente")
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error procesando respuesta de membresía: {e}")
            return APIResponse.error("Error al procesar la respuesta")

@membership_ns.route('/members')
class FincaMembers(Resource):
    @membership_ns.doc('list_finca_members', security=['Bearer'])
    @jwt_required()
    def get(self):
        """Listar todos los miembros de la finca activa del administrador"""
        try:
            user_id = get_jwt_identity()
            user = db.session.get(User, user_id)
            if not user or not user.finca_id: 
                return APIResponse.error("No tienes una finca activa seleccionada")

            # Verificar si es admin de esa finca
            admin_check = UserFinca.query.filter_by(
                user_id=user_id, 
                finca_id=user.finca_id, 
                role='Administrador'
            ).first()
            
            if not admin_check:
                return APIResponse.error("No tienes permisos para ver la lista de miembros", status_code=403)

            memberships = UserFinca.query.filter_by(finca_id=user.finca_id).all()
            return APIResponse.success(data=[m.to_dict() for m in memberships])
        except Exception as e:
            logger.error(f"Error listando miembros: {e}")
            return APIResponse.error("Error al obtener la lista de miembros")

@membership_ns.route('/members/<int:member_id>/remove')
class RemoveMember(Resource):
    @membership_ns.doc('remove_finca_member', security=['Bearer'])
    @jwt_required()
    def post(self, member_id):
        """Eliminar un miembro de la finca (solo Administradores)"""
        try:
            current_user_id = get_jwt_identity()
            
            # member_id es el ID de la tabla user_finca
            m = db.session.get(UserFinca, member_id)
            if not m: 
                return APIResponse.error("Miembro no encontrado", status_code=404)

            # Verificar que el que elimina sea admin de esa finca
            admin_check = UserFinca.query.filter_by(
                user_id=current_user_id, 
                finca_id=m.finca_id, 
                role='Administrador'
            ).first()
            
            if not admin_check:
                return APIResponse.error("No tienes permisos para eliminar miembros", status_code=403)

            if m.user_id == current_user_id: 
                return APIResponse.error("No puedes eliminarte a ti mismo de la finca", status_code=400)

            db.session.delete(m)
            db.session.commit()
            return APIResponse.success(message="Miembro eliminado de la finca correctamente")
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error eliminando miembro: {e}")
            return APIResponse.error("Error al eliminar al miembro")

@membership_ns.route('/search-users')
class SearchUsers(Resource):
    @membership_ns.doc('search_users_to_invite', security=['Bearer'])
    @jwt_required()
    def get(self):
        """Buscar usuarios para invitar (por nombre, identificación o email)"""
        try:
            q = flask.request.args.get('q', '')
            if len(q) < 3: 
                return APIResponse.success(data=[])
            
            # Buscar usuarios que no sean ya del sistema de esa finca? 
            # Por ahora búsqueda general
            users = User.query.filter(
                db.or_(
                    User.fullname.ilike(f'%{q}%'),
                    User.identification.cast(db.String).ilike(f'%{q}%'),
                    User.email.ilike(f'%{q}%')
                )
            ).limit(15).all()
            
            return APIResponse.success(data=[{
                'id': u.id,
                'fullname': u.fullname,
                'identification': u.identification,
                'email': u.email,
                'role': u.role.value if hasattr(u.role, 'value') else str(u.role)
            } for u in users])
        except Exception as e:
            logger.error(f"Error buscando usuarios: {e}")
            return APIResponse.error("Error en la búsqueda")

@membership_ns.route('/switch')
class SwitchFinca(Resource):
    @membership_ns.doc('switch_active_finca', security=['Bearer'])
    @jwt_required()
    def post(self):
        """Cambiar la finca activa del usuario (para contextos multi-finca)"""
        try:
            user_id = get_jwt_identity()
            data = flask.request.get_json() or {}
            finca_id = data.get('finca_id')
            
            if not finca_id: 
                return APIResponse.validation_error({'finca_id': 'Requerido'})
            
            if UserFinca.set_active_finca(user_id, finca_id): 
                return APIResponse.success(message="Finca activa cambiada correctamente")
                
            return APIResponse.error("No tienes acceso a esta finca", status_code=403)
        except Exception as e:
            logger.error(f"Error al cambiar de finca: {e}")
            return APIResponse.error("Error al cambiar de finca")

