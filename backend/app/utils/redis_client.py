"""Shared Redis client factory with resilient connection defaults."""
import logging

logger = logging.getLogger(__name__)

# Defaults applied to every client created by this module.
# health_check_interval revalidates pooled sockets before reuse, so a socket
# reaped by the server is replaced transparently instead of raising
# ConnectionError("Connection closed by server") on the next command.
# No socket_timeout by default: the same pool backs the blocking pubsub
# listener, where a read timeout would force a needless reconnect loop.
DEFAULT_OPTIONS = {
    "socket_connect_timeout": 5,
    "socket_keepalive": True,
    "retry_on_timeout": True,
    "health_check_interval": 30,
}


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
