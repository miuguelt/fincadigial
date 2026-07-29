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
            from ..utils.redis_client import make_redis_client
            redis_client = make_redis_client(redis_url)
            redis_client.ping()
            app.extensions['redis'] = redis_client
            logger.info('Redis native client inicializado y registrado en app.extensions')
        except Exception as e:
            logger.warning(f'Fallo al inicializar Redis native client: {e}')
            app.extensions['redis'] = None
    else:
        app.extensions['redis'] = None

    # Cache setup — shares the native redis_client pool when possible
    try:
        cache_config = {
            'CACHE_TYPE': app.config.get('CACHE_TYPE', 'redis'),
            'CACHE_DEFAULT_TIMEOUT': app.config.get('CACHE_DEFAULT_TIMEOUT', 600),
            'CACHE_THRESHOLD': app.config.get('CACHE_THRESHOLD', 1000),
        }
        if cache_config['CACHE_TYPE'] == 'redis':
            cache_config['CACHE_REDIS_URL'] = app.config.get('CACHE_REDIS_URL') or app.config.get('REDIS_URL')

        cache.init_app(app, config=cache_config)

        if cache_config['CACHE_TYPE'] == 'redis':
            try:
                _k = '__cache_health__'
                cache.set(_k, 'ok', timeout=5)
                if cache.get(_k) != 'ok':
                    raise RuntimeError('Redis check failed')

                # Reuse the native client's connection pool
                _rc = app.extensions.get('redis')
                if _rc is not None:
                    from flask_caching.backends.rediscache import RedisCache
                    app.extensions['cache'][cache] = RedisCache(
                        redis_client=_rc,
                        default_timeout=cache_config['CACHE_DEFAULT_TIMEOUT'],
                    )
                    logger.info('Redis cache comparte pool con native client')

                logger.info('Redis cache inicializado')
            except Exception:
                logger.warning('Redis no disponible, usando SimpleCache fallback')
                app.config['CACHE_TYPE'] = 'simple'
                cache.init_app(app, config={'CACHE_TYPE': 'simple', 'CACHE_DEFAULT_TIMEOUT': cache_config['CACHE_DEFAULT_TIMEOUT']})
    except Exception:
        logger.exception('Error inicializando caché; usando SimpleCache')
        cache.init_app(app, config={'CACHE_TYPE': 'simple', 'CACHE_DEFAULT_TIMEOUT': 600})
