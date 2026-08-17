import threading
import uuid
import logging
from flask import current_app

logger = logging.getLogger(__name__)

# Registro en memoria global de conexiones para desarrollo / fallback sin Redis
# Estructura: { user_id (int): set(connection_ids (uuid strings)) }
_local_connections = {}
_local_lock = threading.Lock()


class PresenceTracker:
    @staticmethod
    def register_connection(user_id: int) -> str:
        """Registra una conexión activa para el usuario y retorna un connection_id único."""
        conn_id = str(uuid.uuid4())
        redis_client = current_app.extensions.get("redis")

        if redis_client:
            try:
                # Clave específica de conexión con TTL de 60 segundos
                key = f"presence:user:{user_id}:{conn_id}"
                redis_client.set(key, "1", ex=60)
                # Agregar al conjunto global de usuarios online en Redis
                redis_client.sadd("presence:online_users", str(user_id))
                logger.debug(
                    f"[PresenceTracker] Registrada conexión Redis para user={user_id} conn={conn_id}"
                )
            except Exception as e:
                logger.error(f"Error registrando presencia en Redis: {e}")

        # Siempre registrar localmente también como fallback / redundancia
        with _local_lock:
            if user_id not in _local_connections:
                _local_connections[user_id] = set()
            _local_connections[user_id].add(conn_id)
            logger.debug(
                f"[PresenceTracker] Registrada conexión local para user={user_id} conn={conn_id}"
            )

        return conn_id

    @staticmethod
    def heartbeat(user_id: int, conn_id: str):
        """Renueva el TTL (Time To Live) de la conexión activa en Redis."""
        redis_client = current_app.extensions.get("redis")
        if redis_client:
            try:
                key = f"presence:user:{user_id}:{conn_id}"
                redis_client.set(key, "1", ex=60)
                redis_client.sadd("presence:online_users", str(user_id))
            except Exception as e:
                logger.error(f"Error actualizando heartbeat en Redis: {e}")

    @staticmethod
    def remove_connection(user_id: int, conn_id: str):
        """Remueve una conexión activa y limpia el estado online global si no quedan más conexiones."""
        redis_client = current_app.extensions.get("redis")

        if redis_client:
            try:
                key = f"presence:user:{user_id}:{conn_id}"
                redis_client.delete(key)

                # Verificar si el usuario aún tiene otras conexiones en Redis
                remaining = redis_client.keys(f"presence:user:{user_id}:*")
                if not remaining:
                    redis_client.srem("presence:online_users", str(user_id))
                logger.debug(
                    f"[PresenceTracker] Removida conexión Redis para user={user_id} conn={conn_id}"
                )
            except Exception as e:
                logger.error(f"Error removiendo presencia en Redis: {e}")

        with _local_lock:
            if user_id in _local_connections:
                _local_connections[user_id].discard(conn_id)
                if not _local_connections[user_id]:
                    del _local_connections[user_id]
                logger.debug(
                    f"[PresenceTracker] Removida conexión local para user={user_id} conn={conn_id}"
                )

    @staticmethod
    def is_user_online(user_id: int) -> bool:
        """Verifica si un usuario tiene al menos una conexión activa registrada."""
        redis_client = current_app.extensions.get("redis")

        if redis_client:
            try:
                keys = redis_client.keys(f"presence:user:{user_id}:*")
                if keys:
                    return True
                # Asegurar limpieza del conjunto global si no hay llaves individuales
                redis_client.srem("presence:online_users", str(user_id))
            except Exception as e:
                logger.error(f"Error verificando presencia en Redis: {e}")

        # Verificar localmente si no está en Redis o falló la verificación
        with _local_lock:
            return (
                user_id in _local_connections and len(_local_connections[user_id]) > 0
            )
