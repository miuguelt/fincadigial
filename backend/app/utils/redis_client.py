"""Shared Redis client factory with resilient connection defaults."""
import logging

logger = logging.getLogger(__name__)

from redis.retry import Retry
from redis.backoff import ExponentialBackoff
from redis.exceptions import ConnectionError, TimeoutError, BusyLoadingError

# Defaults applied to every client created by this module.
# health_check_interval revalidates pooled sockets before reuse, so a socket
# reaped by the server is replaced transparently instead of raising
# ConnectionError("Connection closed by server") on the next command.
# retry and retry_on_error automatically reconnect and retry command execution
# if Memurai closes an idle socket or drops the TCP session.
DEFAULT_OPTIONS = {
    "socket_connect_timeout": 5,
    "socket_keepalive": True,
    "retry_on_timeout": True,
    "retry_on_error": [ConnectionError, TimeoutError, BusyLoadingError],
    "retry": Retry(ExponentialBackoff(cap=5, base=1), 3),
    "health_check_interval": 15,
    "max_connections": 20,
}


def make_redis_ops_client(url: str, **overrides):
    """Build a Redis client for short-lived operations (not pubsub).

    Adds a socket_timeout so callers don't hang indefinitely if the server
    becomes unresponsive.  Uses ``max_connections=10`` by default since
    ops clients don't need the same headroom as the main pool.
    """
    ops_defaults = {
        "socket_timeout": 10,
        "max_connections": 10,
    }
    merged = {**DEFAULT_OPTIONS, **ops_defaults, **overrides}
    return make_redis_client(url, **merged)


def make_redis_client(url: str, **overrides):
    """Build a Redis client from ``url`` with resilient defaults.

    Returns ``None`` if ``url`` is falsy. Raises on connection errors so the
    caller decides the fallback strategy.
    """
    if not url:
        return None
    from redis import Redis

    options = {**DEFAULT_OPTIONS, **overrides}
    return Redis.from_url(url, **options)


def try_make_redis_client(url: str, **overrides):
    """Same as :func:`make_redis_client` but returns ``None`` on failure."""
    try:
        client = make_redis_client(url, **overrides)
        if client is None:
            return None
        client.ping()
        return client
    except Exception as exc:  # pragma: no cover - depends on runtime env
        logger.warning("Redis no disponible en '%s': %s", url, exc)
        return None
