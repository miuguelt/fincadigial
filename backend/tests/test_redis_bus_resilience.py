import pytest
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import TimeoutError as RedisTimeoutError

from app.utils.redis_bus import RedisEventBus


class _FakePubSub:
    def __init__(self, failures):
        self.failures = iter(failures)
        self.closed = False

    def subscribe(self, _channel):
        return None

    def get_message(self, **_kwargs):
        action = next(self.failures)
        if isinstance(action, BaseException):
            raise action
        return action

    def close(self):
        self.closed = True


class _FakeRedis:
    def __init__(self, pubsubs):
        self.pubsubs = iter(pubsubs)
        self.published = []

    def pubsub(self):
        return next(self.pubsubs)

    def publish(self, channel, payload):
        self.published.append((channel, payload))
        raise RedisConnectionError("Connection closed by server.")


def _build_bus(redis_client):
    bus = RedisEventBus.__new__(RedisEventBus)
    bus.redis = redis_client
    bus.redis_sub = redis_client
    bus.channel = "test:events"
    bus.local_subscribers = []
    bus.lock = __import__("threading").Lock()
    bus._circuit_open_until = 0.0
    bus._consecutive_failures = 0
    return bus


def test_listener_closes_broken_pubsub_and_reconnects(monkeypatch):
    first = _FakePubSub([RedisTimeoutError("Timeout reading from socket")])
    second = _FakePubSub([KeyboardInterrupt()])
    client = _FakeRedis([first, second])
    bus = _build_bus(client)
    monkeypatch.setattr("app.utils.redis_bus.time.sleep", lambda _seconds: None)

    with pytest.raises(KeyboardInterrupt):
        bus._listen_to_redis()

    assert first.closed is True
    assert second.closed is True
    assert bus._consecutive_failures == 1


def test_publish_uses_local_fallback_when_redis_closes_socket():
    client = _FakeRedis([])
    bus = _build_bus(client)
    events = bus.subscribe()

    bus.publish("animals", "updated", 7)

    payload = events.get_nowait()
    assert '"endpoint": "animals"' in payload
    assert '"id": 7' in payload
