"""Shared Redis client factory with resilient connection defaults."""

import logging

logger = logging.getLogger(__name__)

from redis.exceptions import ConnectionError, TimeoutError, BusyLoadingError

# Defaults applied to every client created by this module.
# NOTE: A stateful module-level Retry object and retry_on_timeout=True MUST NOT
# be used under gevent, as failed auth or dropped sockets cause infinite recursion
# loops (RecursionError: maximum recursion depth exceeded) that freeze Gunicorn
# workers during startup for minutes.
DEFAULT_OPTIONS = {
    "socket_connect_timeout": 3,
    "socket_timeout": 5,
    "socket_keepalive": True,
    "retry_on_timeout": False,
    "health_check_interval": 15,
    "max_connections": 20,
}


def make_redis_ops_client(url: str, **overrides):
    """Build a Redis client for short-lived operations (not pubsub).

    Adds a socket_timeout so callers don't hang indefinitely if the server
    becomes unresponsive. Uses ``max_connections=10`` by default since
    ops clients don't need the same headroom as the main pool.
    """
    ops_defaults = {
        "socket_connect_timeout": 3,
        "socket_timeout": 5,
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


def make_redis_pubsub_client(url: str, **overrides):
    """Build a Redis client optimized for Pub/Sub (long-lived connections).

    Pub/Sub connections block on ``get_message`` with a short poll timeout,
    so we disable ``socket_timeout`` to avoid spurious TimeoutError when
    Memurai reaps idle sockets.  ``socket_keepalive`` and a shorter
    ``health_check_interval`` ensure broken connections are detected fast.
    """
    if not url:
        return None
    from redis import Redis

    pubsub_defaults = {
        "socket_timeout": None,
        "socket_connect_timeout": 3,
        "socket_keepalive": True,
        "health_check_interval": 10,
        "retry_on_timeout": False,
        "max_connections": 5,
    }
    merged = {**pubsub_defaults, **overrides}
    return Redis.from_url(url, **merged)
