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
    # Backoff bounds and log throttle for the listener loop.
    MIN_BACKOFF_SECONDS = 1
    MAX_BACKOFF_SECONDS = 30
    WARNING_THROTTLE_SECONDS = 60

    def __init__(self, redis_client):
        self.redis = redis_client
        # Dedicated handle for the subscriber side: a connection in subscribe
        # mode cannot serve regular commands, so publishers never share it.
        self.redis_sub = redis_client
        # Nombre de canal semántico con namespace Redis (villaluz:events).
        # Configurable via REDIS_CHANNEL_NAME para soporte multi-tenant.
        import os as _os
        self.channel = _os.getenv('REDIS_CHANNEL_NAME', 'villaluz:events')
        self.local_subscribers = []
        # Callbacks invocados con cada payload recibido del canal, además de las
        # colas SSE. Los usa la invalidación de caché entre workers.
        self.event_hooks = []
        self.lock = threading.Lock()
        self._consecutive_failures = 0
        self._circuit_open_until = 0.0

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
        last_warning = 0.0

        while True:
            pubsub = None
            try:
                pubsub = self.redis_sub.pubsub()
                pubsub.subscribe(self.channel)
                logger.info("Redis EventBus suscrito al canal '%s'", self.channel)

                while True:
                    # get_message with a timeout keeps the loop responsive, so a
                    # broken socket surfaces here instead of blocking forever.
                    message = pubsub.get_message(
                        ignore_subscribe_messages=True, timeout=1.0
                    )
                    if not message:
                        continue
                    if message.get('type') == 'message':
                        self._consecutive_failures = 0
                        payload = message['data']
                        if isinstance(payload, bytes):
                            payload = payload.decode('utf-8')
                        self._dispatch_local(payload)
            except Exception as exc:
                self._consecutive_failures += 1
                backoff = self._backoff_seconds()
                self._circuit_open_until = time.time() + backoff
                now = time.time()
                # Rule: at most one warning per minute for repeating errors without traceback.
                if now - last_warning >= self.WARNING_THROTTLE_SECONDS:
                    err_msg = str(exc)
                    err_type = type(exc).__name__
                    logger.warning(
                        "Redis EventBus desconectado (%s: %s). Reintentando en %ss (throttled)",
                        err_type, err_msg, backoff
                    )
                    last_warning = now
            finally:
                if pubsub is not None:
                    try:
                        pubsub.close()
                    except Exception:
                        pass

            time.sleep(self._backoff_seconds())

    def _backoff_seconds(self) -> int:
        """Exponential backoff derived from the consecutive failure count."""
        if self._consecutive_failures <= 0:
            return self.MIN_BACKOFF_SECONDS
        delay = self.MIN_BACKOFF_SECONDS * (2 ** (self._consecutive_failures - 1))
        return min(delay, self.MAX_BACKOFF_SECONDS)

    def add_event_hook(self, callback):
        """Registra un callback que recibe cada payload entrante del canal."""
        with self.lock:
            self.event_hooks.append(callback)

    def _run_hooks(self, payload: str):
        with self.lock:
            hooks = list(self.event_hooks)
        for hook in hooks:
            try:
                hook(payload)
            except Exception:
                logger.debug("Hook de evento falló", exc_info=True)

    def _dispatch_local(self, payload: str):
        self._run_hooks(payload)
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
        self.event_hooks = []
        self.lock = threading.Lock()

    def add_event_hook(self, callback):
        """Paridad de API con RedisEventBus.

        Un bus en memoria implica un único proceso, donde la invalidación de
        caché ya ocurre en línea tras cada escritura, así que no se invoca.
        """
        with self.lock:
            self.event_hooks.append(callback)

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

