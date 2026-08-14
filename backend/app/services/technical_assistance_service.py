"""Domain workflow for farmer technical-assistance requests.

The generic CRUD endpoint remains available for backwards compatibility, while
this service owns the user-facing workflow: server-side requester attribution,
veterinarian discovery, case claiming, responses, and targeted notifications.
"""

from __future__ import annotations

from datetime import UTC, datetime
import logging

from sqlalchemy import case, or_

from app import db
from app.models.campesino import AssistanceStatus, TechnicalAssistanceRequest
from app.models.user import Role, User
from app.models.user_finca import UserFinca
from app.services.event_service import EventService
from app.services.push_notification_service import PushNotificationService

logger = logging.getLogger(__name__)

SPECIALIST_ROLES = frozenset({Role.Veterinario.value})
MANAGER_ROLES = frozenset({Role.Administrador.value, Role.Propietario.value})
VALID_PRIORITIES = frozenset({'low', 'medium', 'high', 'critical'})


class TechnicalAssistanceError(Exception):
    """Expected workflow error with an HTTP-safe status and code."""

    def __init__(self, message: str, *, status_code: int = 400, code: str = 'ASSISTANCE_ERROR'):
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.code = code


class TechnicalAssistanceService:
    """Coordinates the request lifecycle between farmers and veterinarians."""

    @staticmethod
    def _veterinarian_query(finca_id: int):
        return (
            User.query.outerjoin(
                UserFinca,
                (UserFinca.user_id == User.id)
                & (UserFinca.finca_id == finca_id)
                & UserFinca.is_active.is_(True),
            )
            .filter(
                User.status.is_(True),
                or_(User.finca_id == finca_id, UserFinca.finca_id == finca_id),
                or_(User.role == Role.Veterinario, UserFinca.role == Role.Veterinario.value),
            )
            .distinct()
        )

    @classmethod
    def list_veterinarians(cls, finca_id: int) -> dict:
        veterinarians = cls._veterinarian_query(finca_id).order_by(User.fullname.asc()).all()
        items = []
        verified_count = 0

        for veterinarian in veterinarians:
            credential = getattr(veterinarian, 'professional_credential', None)
            credential_summary = credential.public_summary() if credential else None
            if credential_summary and credential_summary.get('status') == 'Verificado':
                verified_count += 1
            items.append({
                'id': veterinarian.id,
                'fullname': veterinarian.fullname,
                'avatar_url': veterinarian.avatar_url,
                'credential': credential_summary,
            })

        return {
            'veterinarians': items,
            'total': len(items),
            'verified': verified_count,
        }

    @staticmethod
    def _serialize(item: TechnicalAssistanceRequest) -> dict:
        data = item.to_namespace_dict(include_relations=True)
        credential = (
            getattr(item.assignee, 'professional_credential', None)
            if item.assignee
            else None
        )
        data['assignee_credential'] = credential.public_summary() if credential else None
        return data

    @staticmethod
    def _get_request(request_id: int, finca_id: int, *, lock: bool = False):
        query = TechnicalAssistanceRequest.query.filter_by(id=request_id, finca_id=finca_id)
        if lock:
            query = query.with_for_update()
        item = query.first()
        if not item:
            raise TechnicalAssistanceError(
                'Solicitud de asistencia no encontrada.',
                status_code=404,
                code='ASSISTANCE_NOT_FOUND',
            )
        return item

    @classmethod
    def create_request(cls, finca_id: int, requester_user_id: int, payload: dict) -> dict:
        title = str(payload.get('title') or '').strip()
        category = str(payload.get('category') or '').strip()
        description = str(payload.get('description') or '').strip()
        priority = str(payload.get('priority') or 'medium').strip().lower()

        errors = {}
        if len(title) < 4:
            errors['title'] = 'Escribe un título de al menos 4 caracteres.'
        if not category:
            errors['category'] = 'Selecciona el tipo de ayuda que necesitas.'
        if len(description) < 10:
            errors['description'] = 'Describe el problema con al menos 10 caracteres.'
        if priority not in VALID_PRIORITIES:
            errors['priority'] = 'La prioridad indicada no es válida.'
        if errors:
            raise TechnicalAssistanceError(
                'Revisa los datos de la solicitud.',
                status_code=422,
                code='ASSISTANCE_VALIDATION_ERROR',
            )

        item = TechnicalAssistanceRequest.create(
            finca_id=finca_id,
            requester_user_id=requester_user_id,
            title=title,
            category=category,
            description=description,
            priority=priority,
            status=AssistanceStatus.OPEN,
            requested_at=datetime.now(UTC),
        )

        notification = cls._notify_veterinarians(item)
        return {
            'request': cls._serialize(item),
            'notification': notification,
        }

    @classmethod
    def _notify_veterinarians(cls, item: TechnicalAssistanceRequest) -> dict:
        veterinarians = cls._veterinarian_query(item.finca_id).all()
        veterinarian_ids = [veterinarian.id for veterinarian in veterinarians]
        body = f'{item.title} · prioridad {item.priority}'
        event_data = {
            'title': 'Nueva solicitud de asistencia',
            'message': body,
            'notification_type': 'warning' if item.priority in {'high', 'critical'} else 'info',
            'type': 'technical_assistance_request',
            'request_id': item.id,
            'priority': item.priority,
            'action': {
                'label': 'Revisar solicitud',
                'url': '/veterinario/dashboard?focus=assistance',
            },
        }

        for veterinarian_id in veterinarian_ids:
            EventService.emit_to_user(
                user_id=veterinarian_id,
                event_type='technical_assistance_requested',
                data=event_data,
            )

        # The in-app event is the default channel for every request. Native push
        # is reserved for urgent work so a busy farm does not turn every new
        # request into an interruption on every veterinarian's device.
        push_deliveries = 0
        push_enabled = item.priority in {'high', 'critical'}
        if veterinarian_ids and push_enabled:
            try:
                results = PushNotificationService.send_to_users(
                    user_ids=veterinarian_ids,
                    title='Nueva solicitud de asistencia',
                    body=body,
                    data={
                        'type': 'technical_assistance_request',
                        'request_id': item.id,
                        'url': '/veterinario/dashboard?focus=assistance',
                    },
                )
                push_deliveries = sum(results.values())
            except Exception:
                logger.warning(
                    'No se pudo enviar push de asistencia request_id=%s',
                    item.id,
                    exc_info=True,
                )

        return {
            'recipients': len(veterinarian_ids),
            'push_deliveries': push_deliveries,
            'in_app_deliveries': len(veterinarian_ids),
            'push_policy': 'urgent_only',
        }

    @classmethod
    def list_mine(cls, finca_id: int, user_id: int, role: str, *, limit: int = 50) -> dict:
        query = TechnicalAssistanceRequest.query.filter_by(finca_id=finca_id)
        if role not in MANAGER_ROLES:
            # Legacy rows did not record their requester. They remain visible to
            # members of the same farm until each case is closed or assigned.
            query = query.filter(
                or_(
                    TechnicalAssistanceRequest.requester_user_id == user_id,
                    TechnicalAssistanceRequest.requester_user_id.is_(None),
                )
            )

        total = query.count()
        items = (
            query.order_by(TechnicalAssistanceRequest.requested_at.desc())
            .limit(max(1, min(limit, 100)))
            .all()
        )
        return {'items': [cls._serialize(item) for item in items], 'total': total}

    @classmethod
    def list_inbox(cls, finca_id: int, veterinarian_user_id: int, *, limit: int = 50) -> dict:
        active_statuses = [AssistanceStatus.OPEN, AssistanceStatus.IN_PROGRESS]
        base = TechnicalAssistanceRequest.query.filter(
            TechnicalAssistanceRequest.finca_id == finca_id,
            TechnicalAssistanceRequest.status.in_(active_statuses),
        )

        priority_order = case(
            (TechnicalAssistanceRequest.priority == 'critical', 0),
            (TechnicalAssistanceRequest.priority == 'high', 1),
            (TechnicalAssistanceRequest.priority == 'medium', 2),
            else_=3,
        )
        assignment_order = case(
            (TechnicalAssistanceRequest.assigned_user_id == veterinarian_user_id, 0),
            (TechnicalAssistanceRequest.assigned_user_id.is_(None), 1),
            else_=2,
        )
        items = (
            base.order_by(
                assignment_order,
                priority_order,
                TechnicalAssistanceRequest.requested_at.asc(),
            )
            .limit(max(1, min(limit, 100)))
            .all()
        )
        return {
            'items': [cls._serialize(item) for item in items],
            'counts': {
                'waiting': base.filter(TechnicalAssistanceRequest.assigned_user_id.is_(None)).count(),
                'mine': base.filter(
                    TechnicalAssistanceRequest.assigned_user_id == veterinarian_user_id
                ).count(),
                'active': base.count(),
            },
        }

    @classmethod
    def claim(cls, request_id: int, finca_id: int, veterinarian_user_id: int) -> dict:
        item = cls._get_request(request_id, finca_id, lock=True)
        if item.status not in {AssistanceStatus.OPEN, AssistanceStatus.IN_PROGRESS}:
            raise TechnicalAssistanceError(
                'Esta solicitud ya no está disponible para tomar.',
                status_code=409,
                code='ASSISTANCE_NOT_AVAILABLE',
            )
        if item.assigned_user_id and item.assigned_user_id != veterinarian_user_id:
            raise TechnicalAssistanceError(
                'Otro veterinario ya está atendiendo esta solicitud.',
                status_code=409,
                code='ASSISTANCE_ALREADY_ASSIGNED',
            )

        item.assigned_user_id = veterinarian_user_id
        item.status = AssistanceStatus.IN_PROGRESS
        db.session.commit()
        cls._notify_requester(
            item,
            event_type='technical_assistance_claimed',
            title='Un veterinario tomó tu solicitud',
            message=f'{item.assignee.fullname if item.assignee else "El veterinario"} ya está revisando tu caso.',
        )
        return cls._serialize(item)

    @classmethod
    def respond(
        cls,
        request_id: int,
        finca_id: int,
        veterinarian_user_id: int,
        notes: str,
        *,
        resolved: bool = True,
    ) -> dict:
        clean_notes = str(notes or '').strip()
        if len(clean_notes) < 10:
            raise TechnicalAssistanceError(
                'La respuesta debe tener al menos 10 caracteres.',
                status_code=422,
                code='ASSISTANCE_RESPONSE_TOO_SHORT',
            )

        item = cls._get_request(request_id, finca_id, lock=True)
        if item.status in {AssistanceStatus.RESOLVED, AssistanceStatus.CLOSED}:
            raise TechnicalAssistanceError(
                'Esta solicitud ya fue finalizada.',
                status_code=409,
                code='ASSISTANCE_ALREADY_FINISHED',
            )
        if item.assigned_user_id and item.assigned_user_id != veterinarian_user_id:
            raise TechnicalAssistanceError(
                'Otro veterinario está atendiendo esta solicitud.',
                status_code=409,
                code='ASSISTANCE_ALREADY_ASSIGNED',
            )

        item.assigned_user_id = veterinarian_user_id
        item.resolution_notes = clean_notes
        item.status = AssistanceStatus.RESOLVED if resolved else AssistanceStatus.IN_PROGRESS
        item.resolved_at = datetime.now(UTC) if resolved else None
        db.session.commit()

        cls._notify_requester(
            item,
            event_type='technical_assistance_responded',
            title='Tu solicitud recibió respuesta',
            message=f'{item.assignee.fullname if item.assignee else "El veterinario"} respondió: {clean_notes[:90]}',
        )
        return cls._serialize(item)

    @classmethod
    def cancel(cls, request_id: int, finca_id: int, user_id: int, role: str) -> dict:
        item = cls._get_request(request_id, finca_id, lock=True)
        owns_request = item.requester_user_id in {None, user_id}
        if not owns_request and role not in MANAGER_ROLES:
            raise TechnicalAssistanceError(
                'No puedes cancelar la solicitud de otra persona.',
                status_code=403,
                code='ASSISTANCE_CANCEL_FORBIDDEN',
            )
        if item.status in {AssistanceStatus.RESOLVED, AssistanceStatus.CLOSED}:
            raise TechnicalAssistanceError(
                'La solicitud ya fue finalizada.',
                status_code=409,
                code='ASSISTANCE_ALREADY_FINISHED',
            )

        item.status = AssistanceStatus.CLOSED
        db.session.commit()
        return cls._serialize(item)

    @staticmethod
    def _notify_requester(
        item: TechnicalAssistanceRequest,
        *,
        event_type: str,
        title: str,
        message: str,
    ) -> None:
        if not item.requester_user_id:
            return

        event_data = {
            'title': title,
            'message': message,
            'notification_type': 'success',
            'type': event_type,
            'request_id': item.id,
            'action': {
                'label': 'Ver respuesta',
                'url': '/campesino/technical-assistance',
            },
        }
        EventService.emit_to_user(
            user_id=item.requester_user_id,
            event_type=event_type,
            data=event_data,
        )
        try:
            PushNotificationService.send_to_user(
                user_id=item.requester_user_id,
                title=title,
                body=message,
                tag=f'assistance-{item.id}',
                data={
                    'type': event_type,
                    'request_id': item.id,
                    'url': '/campesino/technical-assistance',
                },
            )
        except Exception:
            logger.warning(
                'No se pudo enviar push al solicitante request_id=%s',
                item.id,
                exc_info=True,
            )
