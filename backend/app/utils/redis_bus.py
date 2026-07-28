import json
import logging
import threading
import queue
import time

logger = logging.getLogger(__name__)

class RedisEventBus:
    """
    Bus de eventos escalable utilizando Redis Pub/Sub.
    Permite que múltiples instancias de servidor compartan el mismo stream de eventos.
    """
    def __init__(self, redis_client):
        self.redis = redis_client
        # Nombre de canal semántico con namespace Redis (villaluz:events).
        # Configurable via REDIS_CHANNEL_NAME para soporte multi-tenant.
        import os as _os
        self.channel = _os.getenv('REDIS_CHANNEL_NAME', 'villaluz:events')
        self.local_subscribers = []
        self.lock = threading.Lock()

        # Hilo para escuchar eventos de Redis y distribuirlos localmente
        self.listener_thread = threading.Thread(target=self._listen_to_redis, daemon=True)
        self.listener_thread.start()
        logger.info("Redis EventBus inicializado y escuchando...")

    def _listen_to_redis(self):
        """Listen forever, reconnecting on any Redis failure.

        Without this loop a single dropped connection (server restart, socket
        reaped mid-handshake) killed the daemon thread and silently disabled
        every SSE stream until the backend was restarted.
        """
        backoff = 1
        last_warning = 0.0

        while True:
            pubsub = None
            try:
                pubsub = self.redis.pubsub()
                pubsub.subscribe(self.channel)
                backoff = 1
                logger.info("Redis EventBus suscrito al canal '%s'", self.channel)

                for message in pubsub.listen():
                    if message['type'] == 'message':
                        self._dispatch_local(message['data'].decode('utf-8'))
            except Exception as exc:
                now = time.time()
                # Rule: at most one warning per minute for repeating errors.
                if now - last_warning >= 60:
                    logger.warning(
                        "Redis EventBus desconectado (%s). Reintentando en %ss",
                        exc, backoff
                    )
                    last_warning = now
            finally:
                if pubsub is not None:
                    try:
                        pubsub.close()
                    except Exception:
                        pass

            time.sleep(backoff)
            backoff = min(backoff * 2, 30)

    def _dispatch_local(self, payload: str):
        with self.lock:
            for q in list(self.local_subscribers):
                try:
                    q.put_nowait(payload)
                except queue.Full:
                    try:
                        q.get_nowait()
                        q.put_nowait(payload)
                    except Exception:
                        pass

    def subscribe(self):
        q = queue.Queue(maxsize=1000)
        with self.lock:
            self.local_subscribers.append(q)
        return q

    def unsubscribe(self, q):
        with self.lock:
            try:
                self.local_subscribers.remove(q)
            except ValueError:
                pass

    def publish(self, endpoint: str, action: str, record_id=None):
        payload = json.dumps({
            "endpoint": endpoint,
            "action": action,
            "id": record_id,
            "timestamp": time.time()
        })
        try:
            self.redis.publish(self.channel, payload)
        except Exception as e:
            logger.error(f"Error publicando en Redis EventBus: {e}")
            # Fallback local si falla Redis
            with self.lock:
                for q in list(self.local_subscribers):
                    try:
                        q.put_nowait(payload)
                    except Exception:
                        pass

    def publish_payload(self, payload_dict: dict):
        payload = json.dumps(payload_dict)
        try:
            self.redis.publish(self.channel, payload)
        except Exception as e:
            logger.error(f"Error publicando payload en Redis: {e}")
            with self.lock:
                for q in list(self.local_subscribers):
                    try:
                        q.put_nowait(payload)
                    except Exception:
                        pass

class InMemoryEventBus:
    """Fallback para cuando Redis no está disponible."""
    def __init__(self):
        self.subscribers = []
        self.lock = threading.Lock()

    def subscribe(self):
        q = queue.Queue(maxsize=1000)
        with self.lock:
            self.subscribers.append(q)
        return q

    def unsubscribe(self, q):
        with self.lock:
            try:
                self.subscribers.remove(q)
            except ValueError:
                pass

    def publish(self, endpoint: str, action: str, record_id=None):
        payload = json.dumps({"endpoint": endpoint, "action": action, "id": record_id})
        with self.lock:
            for q in list(self.subscribers):
                try:
                    q.put_nowait(payload)
                except queue.Full:
                    try:
                        q.get_nowait()
                        q.put_nowait(payload)
                    except Exception:
                        pass

    def publish_payload(self, payload_dict: dict):
        payload = json.dumps(payload_dict)
        with self.lock:
            for q in list(self.subscribers):
                try:
                    q.put_nowait(payload)
                except Exception:
                    pass

