import os
import redis
import logging

logger = logging.getLogger(__name__)

# Configuración del pool de conexiones Redis
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')

try:
    redis_client = redis.from_url(
        redis_url, 
        decode_responses=True,
        socket_timeout=5,
        socket_connect_timeout=5,
        retry_on_timeout=True
    )
    # Test connection
    redis_client.ping()
    logger.info("Conexión exitosa a Redis.")
except Exception as e:
    logger.error(f"Error conectando a Redis en {redis_url}: {e}")
    redis_client = None
