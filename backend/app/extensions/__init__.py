import os
import logging
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_caching import Cache
from flask_compress import Compress

# Inicializar extensiones
db = SQLAlchemy(session_options={"expire_on_commit": False})
jwt = JWTManager()
migrate = Migrate()
cache = Cache()
compress = Compress()
redis_client = None # raw client for SSE/RateLimit

def init_extensions(app):
    logger = logging.getLogger(__name__)

    # SQLite compatibility
    db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if isinstance(db_uri, str) and db_uri.startswith('sqlite'):
        app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {}

    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)
    compress.init_app(app)

    # Raw Redis client initialization for app.extensions['redis']
    global redis_client
    redis_url = app.config.get('REDIS_URL')
    if redis_url:
        try:
            from ..utils.redis_client import make_redis_client, make_redis_pubsub_client
            redis_client = make_redis_client(redis_url)
            redis_client.ping()
            app.extensions['redis'] = redis_client
            logger.info('Redis native client inicializado y registrado en app.extensions')

            pubsub_client = make_redis_pubsub_client(redis_url)
            pubsub_client.ping()
            app.extensions['redis_pubsub'] = pubsub_client
            logger.info('Redis Pub/Sub client dedicado inicializado')
        except Exception as e:
            logger.warning(f'Fallo al inicializar Redis native client: {e}')
            app.extensions['redis'] = None
            app.extensions['redis_pubsub'] = None
    else:
        app.extensions['redis'] = None
        app.extensions['redis_pubsub'] = None

    # Cache setup — shares the native redis_client pool when possible
    try:
        cache_config = {
            'CACHE_TYPE': app.config.get('CACHE_TYPE', 'redis'),
            'CACHE_DEFAULT_TIMEOUT': app.config.get('CACHE_DEFAULT_TIMEOUT', 600),
            'CACHE_THRESHOLD': app.config.get('CACHE_THRESHOLD', 1000),
            'CACHE_KEY_PREFIX': app.config.get('CACHE_KEY_PREFIX', 'villaluz:'),
        }
        if cache_config['CACHE_TYPE'] == 'redis':
            # Reuse the resilient client built by utils.redis_client instead of
            # letting flask-caching call redis.from_url() itself: its factory
            # builds a bare pool with no health_check_interval nor retry, so
            # sockets reaped by Memurai's ``timeout`` surface as
            # ConnectionError("Connection closed by server") on the next hit.
            # cachelib.RedisCache accepts a ready client as ``host``; it only
            # calls redis.Redis(...) when host is a string. CACHE_REDIS_URL must
            # stay unset because flask-caching's factory overrides host with it.
            cache_redis_url = app.config.get('CACHE_REDIS_URL') or app.config.get('REDIS_URL')
            if redis_client is not None and cache_redis_url == app.config.get('REDIS_URL'):
                cache_config['CACHE_REDIS_HOST'] = redis_client
            else:
                from ..utils.redis_client import make_redis_client
                cache_config['CACHE_REDIS_HOST'] = make_redis_client(cache_redis_url)
            if cache_config['CACHE_REDIS_HOST'] is None:
                logger.warning('Sin cliente Redis para caché; usando SimpleCache')
                cache_config = {
                    'CACHE_TYPE': 'simple',
                    'CACHE_DEFAULT_TIMEOUT': cache_config['CACHE_DEFAULT_TIMEOUT'],
                    'CACHE_THRESHOLD': cache_config['CACHE_THRESHOLD'],
                }

        cache.init_app(app, config=cache_config)

        if cache_config['CACHE_TYPE'] == 'redis':
            try:
                _k = '__cache_health__'
                cache.set(_k, 'ok', timeout=5)
                if cache.get(_k) != 'ok':
                    raise RuntimeError('Redis check failed')
                logger.info('Redis cache inicializado')
            except Exception as exc:
                logger.warning(
                    'Redis cache no disponible; usando SimpleCache fallback: %s',
                    exc,
                )
                app.config['CACHE_TYPE'] = 'simple'
                cache.init_app(app, config={'CACHE_TYPE': 'simple', 'CACHE_DEFAULT_TIMEOUT': cache_config['CACHE_DEFAULT_TIMEOUT']})
    except Exception:
        logger.exception('Error inicializando caché; usando SimpleCache')
        cache.init_app(app, config={'CACHE_TYPE': 'simple', 'CACHE_DEFAULT_TIMEOUT': 600})
