import json
import logging
import threading
import queue
import time
from typing import Optional

logger = logging.getLogger(__name__)

class RedisEventBus:
    """
    Bus de eventos escalable utilizando Redis Pub/Sub.
    Permite que múltiples instancias de servidor compartan el mismo stream de eventos.
    """
    def __init__(self, redis_client):
        self.redis = redis_client
        self.channel = "_projects/villaluz_events"
        self.local_subscribers = []
        self.lock = threading.Lock()
        
        # Hilo para escuchar eventos de Redis y distribuirlos localmente
        self.listener_thread = threading.Thread(target=self._listen_to_redis, daemon=True)
        self.listener_thread.start()
        logger.info("Redis EventBus inicializado y escuchando...")

    def _listen_to_redis(self):
        pubsub = self.redis.pubsub()
        pubsub.subscribe(self.channel)
        
        for message in pubsub.listen():
            if message['type'] == 'message':
                payload = message['data'].decode('utf-8')
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

