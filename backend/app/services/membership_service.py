"""Servicio de acceso — gestión de acceso multi-finca, invitaciones y solicitudes."""

import logging
from datetime import datetime, UTC

from app import db
from app.models.user_finca import UserFinca
from app.models.join_request import JoinRequest, JoinRequestStatus, JoinRequestType
from app.models.finca import Finca
from app.models.user import User
from app.services.push_notification_service import PushNotificationService
from app.utils.custom_exceptions import BusinessRuleException, ResourceNotFoundException, ForbiddenException

logger = logging.getLogger(__name__)

ADMIN_ROLES = ('Administrador', 'Propietario')


class MembershipService:
    @staticmethod
    def _get_user_or_404(user_id: int) -> User:
        user = db.session.get(User, user_id)
        if not user:
            raise ResourceNotFoundException("Usuario no encontrado")
        return user

    @staticmethod
    def _get_finca_or_404(finca_id: int) -> Finca:
        finca = db.session.get(Finca, finca_id)
        if not finca:
            raise ResourceNotFoundException("Finca no encontrada")
        return finca

    @staticmethod
    def _get_join_request_or_404(request_id: int) -> JoinRequest:
        req = db.session.get(JoinRequest, request_id)
        if not req:
            raise ResourceNotFoundException("Gestión no encontrada")
        return req

    @staticmethod
    def _check_admin_access(user_id: int, finca_id: int) -> UserFinca:
        membership = UserFinca.query.filter(
            UserFinca.user_id == user_id,
            UserFinca.finca_id == finca_id,
            UserFinca.role.in_(ADMIN_ROLES)
        ).first()
        if not membership:
            raise ForbiddenException("No tienes permisos de administrador en esta finca")
        return membership

    @staticmethod
    def create_invitation(admin_user_id: int, finca_id: int, target_user_id: int,
                          role: str = 'Operario', notes: str | None = None) -> JoinRequest:
        MembershipService._check_admin_access(admin_user_id, finca_id)
        target_user = MembershipService._get_user_or_404(target_user_id)

        if UserFinca.has_access(target_user_id, finca_id):
            raise BusinessRuleException(f"{target_user.fullname} ya es miembro de esta finca")

        existing = JoinRequest.query.filter_by(
            user_id=target_user_id, finca_id=finca_id,
            status=JoinRequestStatus.PENDING
        ).first()
        if existing:
            raise BusinessRuleException("Ya existe una gestión pendiente para este usuario")

        req = JoinRequest(
            user_id=target_user_id, finca_id=finca_id,
            request_type=JoinRequestType.INVITATION,
            requested_role=role, notes=notes
        )
        db.session.add(req)
        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass

        try:
            PushNotificationService.send_to_user(
                user_id=target_user_id,
                title='Nueva Invitación',
                body=f'La finca {Finca.query.get(finca_id).name} te ha invitado a unirte como {role}.',
                data={'type': 'membership_invitation', 'request_id': req.id, 'url': '/dashboard/membership'}
            )
        except Exception as e:
            logger.warning(f"No se pudo enviar notificación de invitación: {e}")

        return req

    @staticmethod
    def create_request(user_id: int, finca_id: int, role: str = 'Operario',
                       notes: str | None = None) -> JoinRequest:
        finca = MembershipService._get_finca_or_404(finca_id)

        if UserFinca.has_access(user_id, finca_id):
            raise BusinessRuleException("Ya eres miembro de esta finca")

        existing = JoinRequest.query.filter_by(
            user_id=user_id, finca_id=finca_id,
            status=JoinRequestStatus.PENDING
        ).first()
        if existing:
            raise BusinessRuleException("Ya tienes una solicitud pendiente para esta finca")

        req = JoinRequest(
            user_id=user_id, finca_id=finca_id,
            request_type=JoinRequestType.REQUEST,
            requested_role=role, notes=notes
        )
        db.session.add(req)
        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass

        user = db.session.get(User, user_id)
        try:
            PushNotificationService.send_membership_request_notification(
                request_id=req.id, finca_id=finca_id,
                user_name=user.fullname if user else "Un usuario"
            )
        except Exception as e:
            logger.warning(f"No se pudo enviar notificación: {e}")

        return req

    @staticmethod
    def get_pending(user_id: int) -> dict:
        admin_memberships = UserFinca.query.filter(
            UserFinca.user_id == user_id, UserFinca.role.in_(ADMIN_ROLES)
        ).all()
        managed_ids = [m.finca_id for m in admin_memberships]

        incoming = []
        if managed_ids:
            incoming = JoinRequest.query.filter(
                JoinRequest.finca_id.in_(managed_ids),
                JoinRequest.request_type == JoinRequestType.REQUEST,
                JoinRequest.status == JoinRequestStatus.PENDING
            ).all()

        my_invites = JoinRequest.query.filter_by(
            user_id=user_id, request_type=JoinRequestType.INVITATION,
            status=JoinRequestStatus.PENDING
        ).all()

        return {
            'requests_to_approve': [r.to_dict() for r in incoming],
            'invitations_received': [r.to_dict() for r in my_invites],
        }

    @staticmethod
    def respond_to_request(request_id: int, user_id: int, approve: bool) -> JoinRequest:
        req = MembershipService._get_join_request_or_404(request_id)

        if req.status != JoinRequestStatus.PENDING:
            raise BusinessRuleException("Esta gestión ya ha sido procesada")

        if req.request_type == JoinRequestType.REQUEST:
            MembershipService._check_admin_access(user_id, req.finca_id)
        elif req.user_id != user_id:
            raise ForbiddenException("No puedes responder a una invitación que no es para ti")

        req.status = JoinRequestStatus.APPROVED if approve else JoinRequestStatus.REJECTED
        req.processed_at = datetime.now(UTC)
        req.processed_by = user_id

        if approve:
            UserFinca.assign(user_id=req.user_id, finca_id=req.finca_id, role=req.requested_role, commit=False)

            if req.request_type == JoinRequestType.REQUEST:
                try:
                    PushNotificationService.send_to_user(
                        user_id=req.user_id,
                        title='Solicitud Aprobada',
                        body=f'Has sido aceptado en la finca {req.finca.name}.',
                        data={'type': 'membership_approved', 'finca_id': req.finca_id, 'url': '/dashboard'}
                    )
                except Exception:
                    pass
        elif req.request_type == JoinRequestType.REQUEST:
            try:
                PushNotificationService.send_to_user(
                    user_id=req.user_id,
                    title='Solicitud Rechazada',
                    body=f'Tu solicitud para unirte a {req.finca.name} ha sido declinada.',
                    data={'type': 'membership_rejected', 'finca_id': req.finca_id}
                )
            except Exception:
                pass

        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass
        return req

    @staticmethod
    def get_members(user_id: int) -> list:
        user = MembershipService._get_user_or_404(user_id)
        if not user.finca_id:
            raise BusinessRuleException("No tienes una finca activa seleccionada")

        MembershipService._check_admin_access(user_id, user.finca_id)
        memberships = UserFinca.query.filter_by(finca_id=user.finca_id).all()
        return [m.to_dict() for m in memberships]

    @staticmethod
    def remove_member(current_user_id: int, member_id: int) -> None:
        m = db.session.get(UserFinca, member_id)
        if not m:
            raise ResourceNotFoundException("Miembro no encontrado")

        MembershipService._check_admin_access(current_user_id, m.finca_id)

        if m.user_id == current_user_id:
            raise BusinessRuleException("No puedes eliminarte a ti mismo de la finca")

        db.session.delete(m)
        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass

    @staticmethod
    def edit_member_role(current_user_id: int, member_id: int, new_role: str) -> None:
        m = db.session.get(UserFinca, member_id)
        if not m:
            raise ResourceNotFoundException("Miembro no encontrado")

        MembershipService._check_admin_access(current_user_id, m.finca_id)

        m.role = new_role
        if m.is_primary:
            user = db.session.get(User, m.user_id)
            if user:
                user.role = new_role
        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass

    @staticmethod
    def search_users(query: str) -> list:
        if len(query) < 3:
            return []
        users = User.query.filter(
            db.or_(
                User.fullname.ilike(f'%{query}%'),
                User.identification.cast(db.String).ilike(f'%{query}%'),
                User.email.ilike(f'%{query}%')
            )
        ).limit(15).all()

        return [{
            'id': u.id, 'fullname': u.fullname,
            'identification': u.identification,
            'email': u.email,
            'role': u.role.value if hasattr(u.role, 'value') else str(u.role)
        } for u in users]

    @staticmethod
    def switch_finca(user_id: int, finca_id: int) -> bool:
        if UserFinca.set_active_finca(user_id, finca_id):
            return True
        raise ForbiddenException("No tienes acceso a esta finca")

    @staticmethod
    def get_pending_count(user_id: int) -> int:
        admin_memberships = UserFinca.query.filter(
            UserFinca.user_id == user_id, UserFinca.role.in_(ADMIN_ROLES)
        ).all()
        managed_ids = [m.finca_id for m in admin_memberships]
        if not managed_ids:
            return 0
        return JoinRequest.query.filter(
            JoinRequest.finca_id.in_(managed_ids),
            JoinRequest.request_type == JoinRequestType.REQUEST,
            JoinRequest.status == JoinRequestStatus.PENDING
        ).count()

    @staticmethod
    def approve_direct(request_id: int, admin_user_id: int, role: str | None = None) -> JoinRequest:
        req = MembershipService._get_join_request_or_404(request_id)
        if req.status != JoinRequestStatus.PENDING:
            raise BusinessRuleException("Esta solicitud ya ha sido procesada")

        MembershipService._check_admin_access(admin_user_id, req.finca_id)

        final_role = role or req.requested_role
        req.status = JoinRequestStatus.APPROVED
        req.processed_at = datetime.now(UTC)
        req.processed_by = admin_user_id
        req.requested_role = final_role

        UserFinca.assign(user_id=req.user_id, finca_id=req.finca_id, role=final_role, commit=False)

        try:
            PushNotificationService.send_to_user(
                user_id=req.user_id,
                title='¡Solicitud Aprobada!',
                body=f'Has sido aceptado en la finca {req.finca.name} como {final_role}.',
                data={'type': 'membership_approved', 'finca_id': req.finca_id, 'url': '/dashboard'}
            )
        except Exception:
            pass

        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass
        return req

    @staticmethod
    def reject_direct(request_id: int, admin_user_id: int) -> JoinRequest:
        req = MembershipService._get_join_request_or_404(request_id)
        if req.status != JoinRequestStatus.PENDING:
            raise BusinessRuleException("Esta solicitud ya ha sido procesada")

        MembershipService._check_admin_access(admin_user_id, req.finca_id)

        req.status = JoinRequestStatus.REJECTED
        req.processed_at = datetime.now(UTC)
        req.processed_by = admin_user_id

        try:
            PushNotificationService.send_to_user(
                user_id=req.user_id,
                title='Solicitud Rechazada',
                body=f'Tu solicitud para unirte a la finca {req.finca.name} ha sido rechazada.',
                data={'type': 'membership_rejected', 'finca_id': req.finca_id}
            )
        except Exception:
            pass

        try:
            db.session.commit()
        except Exception as __db_err:
            import logging
            logging.getLogger(__name__).warning('DB Commit falló (infraestructura): %s', __db_err)
            try:
                if 'session' in globals() or 'session' in locals(): db.session.rollback()
                else: db.rollback()
            except: pass
        return req

    @staticmethod
    def build_request_result(req: JoinRequest) -> dict:
        user = db.session.get(User, req.user_id)
        return {
            'id': req.id,
            'user_id': req.user_id,
            'finca_id': req.finca_id,
            'requested_role': req.requested_role,
            'message': req.notes,
            'status': 'Pending',
            'created_at': req.created_at.isoformat() if req.created_at else None,
            'user': {
                'fullname': user.fullname if user else 'N/A',
                'identification': str(user.identification) if user else 'N/A',
                'email': user.email if user else 'N/A',
            } if user else None,
        }

    @staticmethod
    def audit_memberships(user_id: int) -> dict:
        from sqlalchemy import func

        user = MembershipService._get_user_or_404(user_id)

        if not user.finca_id:
            raise BusinessRuleException("No tienes una finca activa seleccionada")

        MembershipService._check_admin_access(user_id, user.finca_id)

        finca = db.session.get(Finca, user.finca_id)

        total_members = UserFinca.query.filter_by(finca_id=user.finca_id, is_active=True).count()

        duplicate_check = db.session.query(
            UserFinca.user_id,
            func.count(UserFinca.id).label('count')
        ).filter(
            UserFinca.finca_id == user.finca_id,
            UserFinca.is_active == True
        ).group_by(UserFinca.user_id).having(func.count(UserFinca.id) > 1).all()

        duplicates = [
            {
                'user_id': user_id_dup,
                'user_fullname': db.session.get(User, user_id_dup).fullname if db.session.get(User, user_id_dup) else 'N/A',
                'count': count
            }
            for user_id_dup, count in duplicate_check
        ]

        multi_finca_users = db.session.query(
            User.id,
            User.fullname,
            User.email,
            func.count(UserFinca.finca_id).label('finca_count')
        ).join(
            UserFinca, User.id == UserFinca.user_id
        ).filter(
            UserFinca.finca_id == user.finca_id,
            UserFinca.is_active == True
        ).group_by(User.id, User.fullname, User.email).having(
            func.count(UserFinca.finca_id) > 1
        ).all()

        users_in_multiple_fincas = [
            {
                'user_id': u_id,
                'fullname': fullname,
                'email': email,
                'finca_count': finca_count
            }
            for u_id, fullname, email, finca_count in multi_finca_users
        ]

        all_fincas = db.session.query(
            Finca.id,
            Finca.name,
            func.count(UserFinca.id).label('member_count')
        ).outerjoin(
            UserFinca, (Finca.id == UserFinca.finca_id) & (UserFinca.is_active == True)
        ).group_by(Finca.id, Finca.name).order_by(func.count(UserFinca.id).desc()).all()

        fincas_summary = [
            {
                'finca_id': f_id,
                'finca_name': name,
                'member_count': count
            }
            for f_id, name, count in all_fincas
        ]

        return {
            'current_finca': {
                'id': finca.id,
                'name': finca.name,
                'total_members': total_members
            },
            'duplicates': duplicates,
            'users_in_multiple_fincas': users_in_multiple_fincas,
            'all_fincas_summary': fincas_summary,
            'summary': {
                'total_fincas': len(all_fincas),
                'total_users_with_access': db.session.query(func.count(func.distinct(UserFinca.user_id))).filter(UserFinca.is_active == True).scalar() or 0,
                'total_memberships': UserFinca.query.filter_by(is_active=True).count(),
                'has_issues': len(duplicates) > 0
            }
        }
