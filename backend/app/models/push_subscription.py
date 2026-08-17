"""
Modelo PushSubscription - Suscripciones Web Push
=================================================

Almacena las suscripciones de usuarios para notificaciones push.

Uso:
    from app.models.push_subscription import PushSubscription

    # Crear suscripción
    PushSubscription.create(
        user_id=1,
        endpoint='https://fcm.googleapis.com/...',
        p256dh='BIPUL...',
        auth='aBCd...',
        user_agent='Mozilla/5.0...'
    )

    # Enviar notificación
    PushSubscription.send_to_user(user_id=1, title='Hola', body='Mensaje')
"""

from app import db
from datetime import datetime, timedelta, UTC
from typing import Any
import logging

logger = logging.getLogger(__name__)


class PushSubscription(db.Model):
    """
    Tabla de suscripciones Web Push.
    Cada entrada representa un dispositivo suscrito por un usuario.
    """

    __tablename__ = "push_subscription"
    __table_args__ = (
        # Índice para búsquedas por usuario
        db.Index("ix_push_subscription_user_id", "user_id"),
        # Índice para buscar por endpoint (útil para unsubscribe)
        db.Index("ix_push_subscription_endpoint", "endpoint", unique=True),
        # Índice para suscripciones activas
        db.Index("ix_push_subscription_is_active", "is_active"),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(
        db.Integer, db.ForeignKey("user.id", ondelete="CASCADE"), nullable=False
    )

    # Datos de la suscripción Web Push (requeridos por el protocolo)
    endpoint = db.Column(db.String(500), nullable=False)
    p256dh = db.Column(db.String(200), nullable=False)  # Clave pública
    auth = db.Column(db.String(100), nullable=False)  # Auth secret

    # Metadatos
    user_agent = db.Column(db.String(500), nullable=True)
    platform = db.Column(db.String(50), nullable=True)  # 'web', 'mobile', 'desktop'
    browser = db.Column(db.String(50), nullable=True)  # 'chrome', 'firefox', 'safari'

    # Estado
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(
        db.DateTime, default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )
    last_used = db.Column(db.DateTime, nullable=True)

    # Relación con User
    user = db.relationship("User", backref="push_subscriptions", lazy="selectin")

    def __repr__(self):
        return f"<PushSubscription user={self.user_id} active={self.is_active}>"

    # =============================================================================
    # Métodos de clase
    # =============================================================================

    @classmethod
    def create(
        cls,
        user_id: int,
        endpoint: str,
        p256dh: str,
        auth: str,
        user_agent: str | None = None,
        platform: str | None = None,
        browser: str | None = None,
    ) -> "PushSubscription":
        """
        Crear una nueva suscripción push.

        Args:
            user_id: ID del usuario
            endpoint: URL del endpoint push (FCM, etc.)
            p256dh: Clave pública del cliente (base64)
            auth: Auth secret del cliente (base64)
            user_agent: User agent string
            platform: Plataforma (web, mobile, desktop)
            browser: Navegador (chrome, firefox, safari)

        Returns:
            PushSubscription creada
        """
        # Detectar plataforma y navegador desde user_agent si no se proporciona
        if user_agent and not (platform and browser):
            detected_platform, detected_browser = cls._detect_platform_browser(
                user_agent
            )
            platform = platform or detected_platform
            browser = browser or detected_browser

        # Buscar si ya existe una suscripción con el mismo endpoint
        existing = cls.query.filter_by(endpoint=endpoint).first()
        if existing:
            # Actualizar suscripción existente
            existing.user_id = user_id
            existing.p256dh = p256dh
            existing.auth = auth
            existing.user_agent = user_agent
            existing.platform = platform
            existing.browser = browser
            existing.is_active = True
            existing.updated_at = datetime.now(UTC)
            db.session.commit()
            return existing

        # Crear nueva suscripción
        subscription = cls(
            user_id=user_id,
            endpoint=endpoint,
            p256dh=p256dh,
            auth=auth,
            user_agent=user_agent,
            platform=platform,
            browser=browser,
            is_active=True,
        )
        db.session.add(subscription)
        db.session.commit()

        logger.info(f"Suscripción push creada para usuario {user_id}")
        return subscription

    @classmethod
    def _detect_platform_browser(cls, user_agent: str) -> tuple:
        """Detectar plataforma y navegador desde user agent."""
        user_agent_lower = user_agent.lower()

        # Detectar navegador
        if "chrome" in user_agent_lower or "chromium" in user_agent_lower:
            browser = "chrome"
        elif "firefox" in user_agent_lower:
            browser = "firefox"
        elif "safari" in user_agent_lower:
            browser = "safari"
        elif "edge" in user_agent_lower:
            browser = "edge"
        else:
            browser = "unknown"

        # Detectar plataforma
        if (
            "mobile" in user_agent_lower
            or "android" in user_agent_lower
            or "iphone" in user_agent_lower
        ):
            platform = "mobile"
        elif "tablet" in user_agent_lower or "ipad" in user_agent_lower:
            platform = "tablet"
        else:
            platform = "desktop"

        return platform, browser

    @classmethod
    def get_user_subscriptions(
        cls, user_id: int, active_only: bool = True
    ) -> list["PushSubscription"]:
        """
        Obtener todas las suscripciones de un usuario.

        Args:
            user_id: ID del usuario
            active_only: Si solo retornar suscripciones activas

        Returns:
            Lista de suscripciones
        """
        query = cls.query.filter_by(user_id=user_id)
        if active_only:
            query = query.filter_by(is_active=True)
        return query.all()

    @classmethod
    def get_all_active_subscriptions(cls) -> list["PushSubscription"]:
        """Obtener todas las suscripciones activas."""
        return cls.query.filter_by(is_active=True).all()

    @classmethod
    def deactivate_by_endpoint(cls, endpoint: str) -> bool:
        """
        Desactivar una suscripción por su endpoint.
        Usado cuando el navegador envía un unsubscribe.

        Args:
            endpoint: URL del endpoint

        Returns:
            True si se desactivó, False si no existía
        """
        subscription = cls.query.filter_by(endpoint=endpoint).first()
        if subscription:
            subscription.is_active = False
            subscription.updated_at = datetime.now(UTC)
            db.session.commit()
            logger.info(f"Suscripción desactivada: {endpoint[:50]}...")
            return True
        return False

    @classmethod
    def deactivate_by_user(cls, user_id: int) -> int:
        """
        Desactivar todas las suscripciones de un usuario.

        Args:
            user_id: ID del usuario

        Returns:
            Número de suscripciones desactivadas
        """
        count = cls.query.filter_by(user_id=user_id, is_active=True).update(
            {"is_active": False, "updated_at": datetime.now(UTC)},
            synchronize_session=False,
        )
        db.session.commit()
        logger.info(f"Desactivadas {count} suscripciones para usuario {user_id}")
        return count

    @classmethod
    def delete_inactive_old(cls, days: int = 30) -> int:
        """
        Eliminar suscripciones inactivas antiguas.

        Args:
            days: Eliminar suscripciones inactivas por más de X días

        Returns:
            Número de suscripciones eliminadas
        """
        cutoff_date = datetime.now(UTC) - timedelta(days=days)

        result = cls.query.filter(
            cls.is_active == False, cls.updated_at < cutoff_date
        ).delete(synchronize_session=False)

        db.session.commit()
        logger.info(f"Eliminadas {result} suscripciones inactivas antiguas")
        return result

    # =============================================================================
    # Métodos de instancia
    # =============================================================================

    def to_dict(self) -> dict[str, Any]:
        """Convertir a diccionario (sin datos sensibles)."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "platform": self.platform,
            "browser": self.browser,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "last_used": self.last_used.isoformat() if self.last_used else None,
        }

    def mark_used(self):
        """Marcar la suscripción como usada recientemente."""
        self.last_used = datetime.now(UTC)
        db.session.commit()
