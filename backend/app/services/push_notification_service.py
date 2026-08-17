"""
Push Notification Service
=========================

Servicio para enviar notificaciones Web Push a usuarios.

Uso:
    from app.services.push_notification_service import PushNotificationService

    # Enviar a un usuario específico
    PushNotificationService.send_to_user(
        user_id=1,
        title='Nueva alerta',
        body='Tienes una nueva tarea asignada',
        data={'url': '/tasks/123'}
    )

    # Enviar a múltiples usuarios
    PushNotificationService.send_to_users(
        user_ids=[1, 2, 3],
        title='Recordatorio',
        body='Revisar animales en cuarentena'
    )

    # Enviar a todos los usuarios de una finca
    PushNotificationService.send_to_finca(
        finca_id=1,
        title='Aviso importante',
        body='Mantenimiento programado'
    )
"""

import json
import logging
from typing import Any
from datetime import datetime, UTC

from app import db
from app.models import PushSubscription
from app.utils.vapid_config import get_vapid_keys

logger = logging.getLogger(__name__)


class PushNotificationService:
    """
    Servicio para gestionar y enviar notificaciones Web Push.
    """

    @classmethod
    def send_to_subscription(
        cls, subscription: PushSubscription, payload: dict[str, Any]
    ) -> bool:
        """
        Enviar notificación a una suscripción específica.

        Args:
            subscription: Objeto PushSubscription
            payload: Dict con 'title', 'body', 'icon', 'data', etc.

        Returns:
            True si se envió exitosamente, False si falló
        """
        try:
            from pywebpush import webpush, WebPushException

            vapid_keys = get_vapid_keys()
            if not vapid_keys["private_key"]:
                logger.error("Claves VAPID no configuradas")
                return False

            # Preparar datos de suscripción
            push_subscription = {
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            }

            # Preparar datos VAPID
            vapid_claims = {
                "sub": vapid_keys["claims_sub"],
                "exp": int(datetime.now(UTC).timestamp()) + 12 * 3600,  # 12 horas
            }

            # Enviar notificación
            webpush(
                subscription_info=push_subscription,
                data=json.dumps(payload),
                vapid_private_key=vapid_keys["private_key"],
                vapid_claims=vapid_claims,
                ttl=86400,  # 24 horas de TTL
            )

            # Marcar como usada
            subscription.mark_used()

            logger.debug(f"Notificación enviada a suscripción {subscription.id}")
            return True

        except WebPushException as e:
            # Si el error es 404 o 410, la suscripción expiró
            if e.response and e.response.status_code in [404, 410]:
                logger.warning(f"Suscripción {subscription.id} expiró, desactivando...")
                subscription.is_active = False
                db.session.commit()
            else:
                logger.error(f"Error enviando push: {e}")
            return False

        except ImportError:
            logger.error("pywebpush no instalado. Ejecuta: pip install pywebpush")
            return False

        except Exception as e:
            logger.error(f"Error inesperado enviando push: {e}", exc_info=True)
            return False

    @classmethod
    def send_to_user(
        cls,
        user_id: int,
        title: str,
        body: str,
        icon: str | None = None,
        data: dict | None = None,
        tag: str | None = None,
    ) -> int:
        """
        Enviar notificación a todos los dispositivos de un usuario.

        Args:
            user_id: ID del usuario
            title: Título de la notificación
            body: Cuerpo del mensaje
            icon: URL del icono (opcional)
            data: Datos adicionales (opcional)
            tag: Tag para agrupar notificaciones (opcional)

        Returns:
            Número de notificaciones enviadas exitosamente
        """
        subscriptions = PushSubscription.get_user_subscriptions(
            user_id, active_only=True
        )

        if not subscriptions:
            logger.debug(f"Usuario {user_id} no tiene suscripciones push activas")
            return 0

        payload = {
            "title": title,
            "body": body,
            "icon": icon or "/assets/icon-192x192.png",
            "badge": "/assets/badge-72x72.png",
            "tag": tag or f"notification-{datetime.now(UTC).timestamp()}",
            "requireInteraction": False,
            "data": data or {},
            "timestamp": int(datetime.now(UTC).timestamp() * 1000),
        }

        success_count = 0
        for subscription in subscriptions:
            if cls.send_to_subscription(subscription, payload):
                success_count += 1

        logger.info(
            f"Enviadas {success_count}/{len(subscriptions)} notificaciones a usuario {user_id}"
        )
        return success_count

    @classmethod
    def send_to_users(
        cls,
        user_ids: list[int],
        title: str,
        body: str,
        icon: str | None = None,
        data: dict | None = None,
    ) -> dict[int, int]:
        """
        Enviar notificación a múltiples usuarios.

        Args:
            user_ids: Lista de IDs de usuarios
            title: Título de la notificación
            body: Cuerpo del mensaje
            icon: URL del icono
            data: Datos adicionales

        Returns:
            Dict con {user_id: count_enviadas}
        """
        results = {}
        for user_id in user_ids:
            count = cls.send_to_user(user_id, title, body, icon, data)
            results[user_id] = count
        return results

    @classmethod
    def send_to_finca(
        cls,
        finca_id: int,
        title: str,
        body: str,
        roles: list[str] | None = None,
        icon: str | None = None,
        data: dict | None = None,
        tag: str | None = None,
    ) -> int:
        """
        Enviar notificación a todos los usuarios de una finca.

        Args:
            finca_id: ID de la finca
            title: Título
            body: Cuerpo
            roles: Filtrar por roles específicos (opcional)
            icon: URL del icono
            data: Datos adicionales
            tag: Tag para agrupar notificaciones (opcional)

        Returns:
            Número total de notificaciones enviadas
        """
        from app.models import User, UserFinca

        # Obtener usuarios de la finca
        query = (
            db.session.query(User)
            .join(UserFinca, User.id == UserFinca.user_id)
            .filter(UserFinca.finca_id == finca_id, UserFinca.is_active == True)
        )

        if roles:
            query = query.filter(User.role.in_(roles))

        users = query.all()

        total_sent = 0
        for user in users:
            count = cls.send_to_user(user.id, title, body, icon, data, tag)
            total_sent += count

        logger.info(
            f"Enviadas {total_sent} notificaciones a {len(users)} usuarios de finca {finca_id}"
        )
        return total_sent

    @classmethod
    def send_alert_notification(cls, alert_id: int, user_id: int) -> bool:
        """
        Enviar notificación de alerta del sistema.

        Args:
            alert_id: ID de la alerta
            user_id: ID del usuario destino

        Returns:
            True si se envió al menos una notificación
        """
        from app.models import AnimalAlert

        alert = AnimalAlert.query.get(alert_id)
        if not alert:
            logger.warning(f"Alerta {alert_id} no encontrada")
            return False

        title = f"Alerta: {alert.alert_type}"
        body = alert.message or f"Revisar animal ID: {alert.animal_id}"

        data = {
            "type": "alert",
            "alert_id": alert_id,
            "animal_id": alert.animal_id,
            "alert_type": alert.alert_type,
            "url": f"/animals/{alert.animal_id}",
        }

        count = cls.send_to_user(
            user_id, title, body, data=data, tag=f"alert-{alert_id}"
        )
        return count > 0

    @classmethod
    def send_welcome_notification(cls, user_id: int) -> bool:
        """
        Enviar notificación de bienvenida a un usuario nuevo.

        Args:
            user_id: ID del usuario

        Returns:
            True si se envió exitosamente
        """
        count = cls.send_to_user(
            user_id=user_id,
            title="¡Bienvenido a Finca Villa Luz!",
            body="Has activado las notificaciones push. Recibirás alertas importantes aquí.",
            tag="welcome",
            data={"type": "welcome", "url": "/dashboard"},
        )
        return count > 0

    @classmethod
    def send_membership_request_notification(
        cls, request_id: int, finca_id: int, user_name: str
    ) -> int:
        """
        Notificar a los administradores de una finca sobre una nueva solicitud de membresía.

        Args:
            request_id: ID de la solicitud
            finca_id: ID de la finca destino
            user_name: Nombre del usuario que solicita

        Returns:
            Número de notificaciones enviadas
        """
        from app.models.user import Role

        return cls.send_to_finca(
            finca_id=finca_id,
            title="Nueva Solicitud de Membresía",
            body=f"{user_name} ha solicitado unirse a la finca.",
            roles=[Role.Administrador.value, Role.Propietario.value],
            tag="membership-flask.request",
            data={
                "type": "membership_request",
                "request_id": request_id,
                "url": "/admin/membership",
            },
        )

    @classmethod
    def send_sync_complete_notification(cls, user_id: int, items_synced: int) -> bool:
        """
        Notificar que la sincronización offline se completó.

        Args:
            user_id: ID del usuario
            items_synced: Número de items sincronizados

        Returns:
            True si se envió exitosamente
        """
        count = cls.send_to_user(
            user_id=user_id,
            title="Sincronización completada",
            body=f"{items_synced} registros sincronizados con el servidor.",
            tag="sync-complete",
            data={"type": "sync", "items_synced": items_synced},
        )
        return count > 0

    @classmethod
    def broadcast_to_all(
        cls, title: str, body: str, icon: str | None = None, data: dict | None = None
    ) -> int:
        """
        Enviar notificación a TODOS los usuarios con suscripciones activas.
        ⚠️ Usar con precaución.

        Args:
            title: Título
            body: Cuerpo
            icon: Icono
            data: Datos adicionales

        Returns:
            Número total de notificaciones enviadas
        """
        subscriptions = PushSubscription.get_all_active_subscriptions()

        payload = {
            "title": title,
            "body": body,
            "icon": icon or "/assets/icon-192x192.png",
            "badge": "/assets/badge-72x72.png",
            "tag": f"broadcast-{datetime.now(UTC).timestamp()}",
            "data": data or {"type": "broadcast"},
            "timestamp": int(datetime.now(UTC).timestamp() * 1000),
        }

        success_count = 0
        for subscription in subscriptions:
            if cls.send_to_subscription(subscription, payload):
                success_count += 1

        logger.info(
            f"Broadcast enviado a {success_count}/{len(subscriptions)} dispositivos"
        )
        return success_count

    @classmethod
    def get_user_subscription_count(cls, user_id: int) -> int:
        """
        Obtener número de suscripciones activas de un usuario.

        Args:
            user_id: ID del usuario

        Returns:
            Número de suscripciones
        """
        return len(PushSubscription.get_user_subscriptions(user_id, active_only=True))

    @classmethod
    def cleanup_expired_subscriptions(cls, days: int = 30) -> int:
        """
        Limpiar suscripciones expiradas/inactivas.

        Args:
            days: Eliminar suscripciones inactivas por más de X días

        Returns:
            Número de suscripciones eliminadas
        """
        return PushSubscription.delete_inactive_old(days)
