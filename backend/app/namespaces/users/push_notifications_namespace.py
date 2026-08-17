"""
Push Notifications Namespace
============================

Endpoints para gestionar suscripciones Web Push y enviar notificaciones.

Uso:
    GET  /api/v1/push/vapid-public-key         → Obtener clave pública VAPID
    POST /api/v1/push/subscribe                → Suscribirse a notificaciones
    POST /api/v1/push/unsubscribe              → Desuscribirse
    GET  /api/v1/push/subscriptions            → Listar suscripciones del usuario
    POST /api/v1/push/test                     → Enviar notificación de prueba

Seguridad:
    - VAPID para autenticación del servidor
    - JWT para identificación del usuario
"""

import flask
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
import logging

from app.utils.response_handler import APIResponse
from app.utils.vapid_config import get_vapid_keys
from app.models import PushSubscription
from app.services.push_notification_service import PushNotificationService

logger = logging.getLogger(__name__)

# Namespace
push_ns = Namespace("push", description="Notificaciones Web Push")

# =============================================================================
# Modelos para documentación Swagger
# =============================================================================

subscription_model = push_ns.model(
    "PushSubscription",
    {
        "endpoint": fields.String(required=True, description="URL del endpoint push"),
        "keys": fields.Nested(
            push_ns.model(
                "PushKeys",
                {
                    "p256dh": fields.String(required=True, description="Clave pública"),
                    "auth": fields.String(required=True, description="Auth secret"),
                },
            ),
            required=True,
        ),
    },
)

unsubscribe_model = push_ns.model(
    "UnsubscribeRequest",
    {
        "endpoint": fields.String(
            required=True, description="URL del endpoint a desuscribir"
        ),
    },
)

test_notification_model = push_ns.model(
    "TestNotificationRequest",
    {
        "title": fields.String(
            description="Título de la notificación", default="Notificación de prueba"
        ),
        "body": fields.String(
            description="Cuerpo del mensaje", default="¡Las notificaciones funcionan!"
        ),
    },
)

subscription_info_model = push_ns.model(
    "SubscriptionInfo",
    {
        "id": fields.Integer(),
        "platform": fields.String(),
        "browser": fields.String(),
        "is_active": fields.Boolean(),
        "created_at": fields.String(),
        "last_used": fields.String(),
    },
)


# =============================================================================
# Endpoints
# =============================================================================


@push_ns.route("/vapid-public-key")
class VapidPublicKeyResource(Resource):
    """Obtener la clave pública VAPID para suscripción."""

    @push_ns.doc("get_vapid_public_key")
    @push_ns.response(200, "Clave pública obtenida")
    def get(self):
        """
        Obtener la clave pública VAPID.

        Esta clave es necesaria en el frontend para suscribirse
        a notificaciones push via PushManager.subscribe().
        """
        try:
            vapid_keys = get_vapid_keys()

            if not vapid_keys["public_key"]:
                return APIResponse.error(
                    "VAPID no configurado en el servidor",
                    status_code=503,
                    error_code="VAPID_NOT_CONFIGURED",
                )

            return APIResponse.success(
                message="Clave pública VAPID obtenida",
                data={
                    "public_key": vapid_keys["public_key"],
                    "subject": vapid_keys["claims_sub"],
                },
            )

        except Exception as e:
            logger.error(f"Error obteniendo VAPID key: {e}", exc_info=True)
            return APIResponse.error(
                "Error al obtener clave pública",
                details={"error": str(e)},
                status_code=500,
            )


@push_ns.route("/subscribe")
class SubscribeResource(Resource):
    """Suscribirse a notificaciones push."""

    @jwt_required()
    @push_ns.doc("subscribe_push", security="jwt")
    @push_ns.expect(subscription_model)
    @push_ns.response(201, "Suscripción creada")
    @push_ns.response(400, "Datos inválidos")
    @push_ns.response(401, "No autenticado")
    def post(self):
        """
        Suscribir el dispositivo actual a notificaciones push.

        El frontend debe obtener la suscripción desde PushManager.subscribe()
        y enviarla aquí para almacenarla en el servidor.
        """
        try:
            user_id = get_jwt_identity()
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error("ID de usuario inválido", status_code=400)

            data = flask.request.get_json() or {}
            subscription_data = data.get("subscription") or data

            # Validar datos requeridos
            endpoint = subscription_data.get("endpoint")
            keys = subscription_data.get("keys", {})
            p256dh = keys.get("p256dh")
            auth = keys.get("auth")

            if not all([endpoint, p256dh, auth]):
                return APIResponse.validation_error(
                    {
                        "endpoint": "Requerido" if not endpoint else None,
                        "keys.p256dh": "Requerido" if not p256dh else None,
                        "keys.auth": "Requerido" if not auth else None,
                    }
                )

            # Crear o actualizar suscripción
            user_agent = flask.request.headers.get("User-Agent", "")

            subscription = PushSubscription.create(
                user_id=user_id,
                endpoint=endpoint,
                p256dh=p256dh,
                auth=auth,
                user_agent=user_agent,
            )

            # Enviar notificación de bienvenida si es nueva
            is_new = subscription.created_at == subscription.updated_at
            if is_new:
                PushNotificationService.send_welcome_notification(user_id)

            logger.info(f"Usuario {user_id} suscrito a notificaciones push")

            return APIResponse.success(
                message="Suscripción creada exitosamente",
                data={
                    "subscription_id": subscription.id,
                    "is_new": is_new,
                    "platform": subscription.platform,
                    "browser": subscription.browser,
                },
                status_code=201,
            )

        except Exception as e:
            logger.error(f"Error en suscripción push: {e}", exc_info=True)
            return APIResponse.error(
                "Error al crear suscripción", details={"error": str(e)}, status_code=500
            )


@push_ns.route("/unsubscribe")
class UnsubscribeResource(Resource):
    """Desuscribirse de notificaciones push."""

    @jwt_required()
    @push_ns.doc("unsubscribe_push", security="jwt")
    @push_ns.expect(unsubscribe_model)
    @push_ns.response(200, "Suscripción desactivada")
    def post(self):
        """
        Desactivar la suscripción push del dispositivo.

        Puede enviar el endpoint específico o se desactivarán todas
        las suscripciones del usuario.
        """
        try:
            user_id = get_jwt_identity()
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error("ID de usuario inválido", status_code=400)

            data = flask.request.get_json() or {}
            endpoint = data.get("endpoint")

            if endpoint:
                # Desactivar suscripción específica
                success = PushSubscription.deactivate_by_endpoint(endpoint)
                if success:
                    logger.info(f"Suscripción desactivada: {endpoint[:50]}...")
                    return APIResponse.success(
                        message="Suscripción desactivada exitosamente"
                    )
                else:
                    return APIResponse.error(
                        "Suscripción no encontrada", status_code=404
                    )
            else:
                # Desactivar todas las suscripciones del usuario
                count = PushSubscription.deactivate_by_user(user_id)
                logger.info(
                    f"Desactivadas {count} suscripciones para usuario {user_id}"
                )
                return APIResponse.success(
                    message=f"{count} suscripciones desactivadas"
                )

        except Exception as e:
            logger.error(f"Error en desuscripción: {e}", exc_info=True)
            return APIResponse.error(
                "Error al desactivar suscripción",
                details={"error": str(e)},
                status_code=500,
            )


@push_ns.route("/subscriptions")
class UserSubscriptionsResource(Resource):
    """Gestionar suscripciones del usuario."""

    @jwt_required()
    @push_ns.doc("list_subscriptions", security="jwt")
    @push_ns.response(200, "Lista de suscripciones", [subscription_info_model])
    def get(self):
        """
        Listar todas las suscripciones push del usuario.
        """
        try:
            user_id = get_jwt_identity()
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error("ID de usuario inválido", status_code=400)

            subscriptions = PushSubscription.get_user_subscriptions(
                user_id, active_only=False
            )

            return APIResponse.success(
                message=f"{len(subscriptions)} suscripciones encontradas",
                data={
                    "subscriptions": [s.to_dict() for s in subscriptions],
                    "active_count": len([s for s in subscriptions if s.is_active]),
                    "total_count": len(subscriptions),
                },
            )

        except Exception as e:
            logger.error(f"Error listando suscripciones: {e}", exc_info=True)
            return APIResponse.error(
                "Error al obtener suscripciones",
                details={"error": str(e)},
                status_code=500,
            )

    @jwt_required()
    @push_ns.doc("delete_all_subscriptions", security="jwt")
    @push_ns.response(200, "Todas las suscripciones desactivadas")
    def delete(self):
        """
        Desactivar TODAS las suscripciones push del usuario.
        """
        try:
            user_id = get_jwt_identity()
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error("ID de usuario inválido", status_code=400)

            count = PushSubscription.deactivate_by_user(user_id)

            logger.info(f"Usuario {user_id} desactivó todas sus suscripciones push")

            return APIResponse.success(message=f"{count} suscripciones desactivadas")

        except Exception as e:
            logger.error(f"Error desactivando suscripciones: {e}", exc_info=True)
            return APIResponse.error(
                "Error al desactivar suscripciones",
                details={"error": str(e)},
                status_code=500,
            )


@push_ns.route("/test")
class TestNotificationResource(Resource):
    """Enviar notificación de prueba."""

    @jwt_required()
    @push_ns.doc("send_test_notification", security="jwt")
    @push_ns.expect(test_notification_model)
    @push_ns.response(200, "Notificación enviada")
    def post(self):
        """
        Enviar una notificación de prueba al usuario actual.

        Útil para verificar que las notificaciones push funcionan correctamente.
        """
        try:
            user_id = get_jwt_identity()
            try:
                user_id = int(user_id)
            except (ValueError, TypeError):
                return APIResponse.error("ID de usuario inválido", status_code=400)

            data = flask.request.get_json() or {}
            title = data.get("title", "Notificación de prueba")
            body = data.get("body", "¡Las notificaciones funcionan correctamente!")

            # Verificar si el usuario tiene suscripciones
            subscription_count = PushNotificationService.get_user_subscription_count(
                user_id
            )

            if subscription_count == 0:
                return APIResponse.error(
                    "No tienes dispositivos suscritos a notificaciones push. "
                    "Habilita las notificaciones en tu navegador primero.",
                    status_code=400,
                    error_code="NO_SUBSCRIPTIONS",
                )

            # Enviar notificación de prueba
            count = PushNotificationService.send_to_user(
                user_id=user_id,
                title=title,
                body=body,
                tag="test-notification",
                data={"type": "test", "url": "/settings/notifications"},
            )

            return APIResponse.success(
                message=f"Notificación de prueba enviada a {count} dispositivos",
                data={
                    "devices_notified": count,
                    "total_subscriptions": subscription_count,
                },
            )

        except Exception as e:
            logger.error(f"Error enviando notificación de prueba: {e}", exc_info=True)
            return APIResponse.error(
                "Error al enviar notificación",
                details={"error": str(e)},
                status_code=500,
            )


@push_ns.route("/stats")
class PushStatsResource(Resource):
    """Estadísticas de notificaciones push (Admin only)."""

    @jwt_required()
    @push_ns.doc("push_stats", security="jwt")
    @push_ns.response(200, "Estadísticas obtenidas")
    @push_ns.response(403, "No autorizado")
    def get(self):
        """
        Obtener estadísticas de notificaciones push.
        Solo para administradores.
        """
        try:
            from flask_jwt_extended import get_jwt

            user_id = get_jwt_identity()
            jwt_data = get_jwt()
            role = jwt_data.get("role")

            # Solo admin puede ver stats
            if role not in ["Administrador", "Propietario"]:
                return APIResponse.error(
                    "Solo administradores pueden ver estadísticas", status_code=403
                )

            # Contar suscripciones
            total_subs = PushSubscription.query.count()
            active_subs = PushSubscription.query.filter_by(is_active=True).count()

            # Contar por plataforma
            platform_stats = {}
            for platform in ["mobile", "desktop", "tablet", "unknown"]:
                count = PushSubscription.query.filter_by(
                    platform=platform, is_active=True
                ).count()
                if count > 0:
                    platform_stats[platform] = count

            # Contar por navegador
            browser_stats = {}
            for browser in ["chrome", "firefox", "safari", "edge", "unknown"]:
                count = PushSubscription.query.filter_by(
                    browser=browser, is_active=True
                ).count()
                if count > 0:
                    browser_stats[browser] = count

            return APIResponse.success(
                message="Estadísticas de notificaciones push",
                data={
                    "total_subscriptions": total_subs,
                    "active_subscriptions": active_subs,
                    "inactive_subscriptions": total_subs - active_subs,
                    "by_platform": platform_stats,
                    "by_browser": browser_stats,
                },
            )

        except Exception as e:
            logger.error(f"Error obteniendo stats: {e}", exc_info=True)
            return APIResponse.error(
                "Error al obtener estadísticas",
                details={"error": str(e)},
                status_code=500,
            )
