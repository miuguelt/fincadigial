import json
import logging
import flask
import time
from typing import Any

logger = logging.getLogger(__name__)

class EventService:
    """
    Servicio para centralizar el envío de eventos a través del EventBus.
    Soporta eventos de sistema y eventos dirigidos a usuarios.
    """

    @staticmethod
    def _get_bus():
        return flask.current_app.extensions.get('event_bus')

    @classmethod
    def emit(cls, endpoint: str, action: str, record_id: Any | None = None, data: dict | None = None):
        """Emite un evento genérico al bus."""
        bus = cls._get_bus()
        if not bus:
            logger.warning("EventBus no configurado. El evento no se emitirá.")
            return

        payload = {
            "endpoint": endpoint,
            "action": action,
            "id": record_id,
            "data": data,
            "timestamp": time.time()
        }

        try:
            if hasattr(bus, 'publish_payload'):
                bus.publish_payload(payload)
            else:
                bus.publish(endpoint, action, record_id)
        except Exception as e:
            logger.error(f"Error al emitir evento: {e}")

    @classmethod
    def emit_to_user(cls, user_id: int, event_type: str, data: dict):
        """Emite un evento dirigido a un usuario específico."""
        bus = cls._get_bus()
        if not bus:
            return

        payload = {
            "endpoint": "user_notification",
            "event": event_type,
            "recipient_id": user_id,
            "data": data,
            "timestamp": time.time()
        }

        try:
            if hasattr(bus, 'publish_payload'):
                bus.publish_payload(payload)
            else:
                bus.publish(endpoint="user_notification", action=event_type, record_id=json.dumps(payload))
        except Exception as e:
            logger.error(f"Error al emitir evento a usuario {user_id}: {e}")

    @classmethod
    def emit_chat_message(cls, message_data: dict):
        """
        Emite un evento de nuevo mensaje de chat.
        Este evento debe ser escuchado por el frontend para actualización en tiempo real.
        """
        # Notificar al destinatario
        cls.emit_to_user(
            user_id=message_data['recipient_id'],
            event_type='chat_message',
            data=message_data
        )

        # También al remitente (para sincronizar entre múltiples pestañas/dispositivos)
        cls.emit_to_user(
            user_id=message_data['sender_id'],
            event_type='chat_message_sent',
            data=message_data
        )

    @classmethod
    def emit_system_alert(cls, title: str, message: str, alert_type: str = 'info'):
        """Emite una alerta de sistema global."""
        cls.emit(
            endpoint="system_alert",
            action="new_alert",
            data={
                "title": title,
                "message": message,
                "type": alert_type
            }
        )
