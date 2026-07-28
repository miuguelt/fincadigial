import os
from dotenv import load_dotenv
from datetime import timedelta
from typing import Any
import logging
from urllib.parse import quote_plus
from pathlib import Path

# Cargar variables de entorno desde .env antes de leer la configuracion.
# Se usa override=False para no pisar variables ya cargadas por run.py/wsgi.py
# ni las variables de entorno de Docker/Coolify/sistema.
_PROJECT_ROOT = Path(__file__).resolve().parent.parent
_ROOT_ENV_FILE = _PROJECT_ROOT / '.env'
load_dotenv(dotenv_path=_ROOT_ENV_FILE, override=False)

def _get_wsl_ip():
    """Return the WSL host IP when explicitly configured via WSL_HOST_IP.

    Auto-detection used to shell out to `wsl hostname -I` on every import. On a
    native Windows host without WSL that call fails in a locale-encoded (cp1252)
    error message, which crashed subprocess' reader thread with UnicodeDecodeError
    on every app start. It also silently rewrote the PostgreSQL and Redis hosts,
    which must stay on 127.0.0.1 in this deployment.
    """
    ip = os.getenv('WSL_HOST_IP', '').strip()
    return ip or None

_WSL_IP = _get_wsl_ip()

# Helper para parsear CORS_ORIGINS desde variables de entorno (.env)
# Admite formato JSON (p.ej. ["https://a.com","http://b.com"]) o CSV (a.com,b.com)
# Retorna una lista de strings o None si no se definió.
def _parse_cors_origins_env():
    raw = os.getenv('CORS_ORIGINS')
    if not raw:
        return None
    try:
        raw_stripped = raw.strip()
        # Si es JSON array
        if raw_stripped.startswith('['):
            import json as _json
            data = _json.loads(raw_stripped)
            if isinstance(data, list):
                items = []
                for x in data:
                    if not isinstance(x, str):
                        x = str(x)
                    s = x.strip().strip("\"'`").strip('`')
                    if s:
                        items.append(s)
                # dedupe preservando orden
                seen = set()
                deduped = []
                for it in items:
                    if it not in seen:
                        deduped.append(it)
                        seen.add(it)
                return deduped
    except Exception:
        pass
    # Fallback: CSV
    items = [s.strip().strip("\"'`").strip('`') for s in raw.split(',')]
    items = [s for s in items if s]
    seen = set()
    deduped = []
    for it in items:
        if it not in seen:
            deduped.append(it)
            seen.add(it)
    return deduped or None


def _build_sqlalchemy_database_uri():
    """Build SQLALCHEMY_DATABASE_URI from DB_* env vars when not provided."""
    uri = os.getenv('SQLALCHEMY_DATABASE_URI')
    if uri:
        # Si la URI ya tiene el driver, la usamos tal cual
        return uri

    # En desarrollo local permitimos una base SQLite auto-contenida para no
    # depender de un PostgreSQL externo cuando solo se quiere levantar la API.
    dev_uri = os.getenv('DEV_DATABASE_URL')
    active_env = (os.getenv('FLASK_ENV') or os.getenv('FLASK_CONFIG') or 'development').strip().lower()
    if active_env == 'development' and dev_uri:
        return dev_uri

    host = os.getenv('DB_HOST')
    if _WSL_IP and host in ('localhost', '127.0.0.1'):
        host = _WSL_IP
        
    engine = os.getenv('DB_ENGINE', 'mysql+pymysql')

    # Puerto por defecto según motor
    default_port = '5432' if 'postgresql' in engine else '3306'
    port = os.getenv('DB_PORT') or default_port

    name = os.getenv('DB_NAME')
    user = os.getenv('DB_USER')
    password = os.getenv('DB_PASSWORD')

    if not all([host, name, user, password]):
        return None

    try:
        safe_user = quote_plus(str(user))
        safe_password = quote_plus(str(password))
    except Exception:
        safe_user = str(user)
        safe_password = str(password)

    return f"{engine}://{safe_user}:{safe_password}@{host}:{port}/{name}"


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {'1', 'true', 'yes', 'y', 'on'}


class Config:
    """Configuración base de la aplicación. Aplica a todos los entornos."""

    # -----------------------
    # Base de Datos
    # -----------------------
    HOST = _WSL_IP if (_WSL_IP and os.getenv('DB_HOST') in ('localhost', '127.0.0.1')) else os.getenv('DB_HOST')
    PORT = os.getenv('DB_PORT') or '5432'
    DATABASE = os.getenv('DB_NAME')
    DB_USER = os.getenv('DB_USER')
    DB_PASSWORD = os.getenv('DB_PASSWORD')
    DB_DRIVER = 'pymysql'  # pymysql | mysqldb | mysqlconnector
    SQLALCHEMY_DATABASE_URI = _build_sqlalchemy_database_uri()
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError("SQLALCHEMY_DATABASE_URI o DB_* (DB_HOST/DB_NAME/DB_USER/DB_PASSWORD) es requerido")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Optimizaciones Pro para PostgreSQL 18 y alta concurrencia
    SQLALCHEMY_ENGINE_OPTIONS: dict[str, Any] = {
        'pool_size': int(os.getenv('DB_POOL_SIZE', '20')),
        'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '40')),
        'pool_timeout': 30,
        'pool_recycle': 1800,
        'pool_pre_ping': True,
        'echo': False,
        'pool_reset_on_return': 'commit',
    }

    # Serializador JSON de alto rendimiento si está disponible
    try:
        import orjson
        SQLALCHEMY_ENGINE_OPTIONS['json_serializer'] = lambda obj: orjson.dumps(obj).decode()
        SQLALCHEMY_ENGINE_OPTIONS['json_deserializer'] = orjson.loads
    except ImportError:
        try:
            import ujson
            SQLALCHEMY_ENGINE_OPTIONS['json_serializer'] = ujson.dumps
            SQLALCHEMY_ENGINE_OPTIONS['json_deserializer'] = ujson.loads
        except ImportError:
            pass

    # Configurar connect_args dinámicamente según el motor
    _connect_args: dict[str, Any] = {
        'connect_timeout': 60,
    }

    if SQLALCHEMY_DATABASE_URI and 'mysql' in SQLALCHEMY_DATABASE_URI:
        _connect_args.update({
            'charset': 'utf8mb4',
            'sql_mode': 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO'
        })
    elif SQLALCHEMY_DATABASE_URI and 'postgresql' in SQLALCHEMY_DATABASE_URI:
        # Optimizaciones específicas para PostgreSQL 18
        _connect_args.update({
            'application_name': 'villaluz_api_pro',
            'options': '-c statement_timeout=30000 -c lock_timeout=10000', # 30s timeout de ejecución, 10s para bloqueos
            'keepalives': 1,
            'keepalives_idle': 30,
            'keepalives_interval': 10,
            'keepalives_count': 5
        })

    SQLALCHEMY_ENGINE_OPTIONS['connect_args'] = _connect_args

    # Si se usa SQLite, eliminar opciones de pool incompatibles
    _maybe_db_uri = SQLALCHEMY_DATABASE_URI
    if isinstance(_maybe_db_uri, str) and _maybe_db_uri.startswith('sqlite'):
        SQLALCHEMY_ENGINE_OPTIONS = {}

    # -----------------------
    # Cache & Rendimiento
    # -----------------------
    # Redis — Construcción inteligente: usa REDIS_URL directa si existe,
    # sino la construye desde REDIS_HOST/PORT/PASSWORD/DB.
    REDIS_URL = os.getenv('REDIS_URL')
    if not REDIS_URL:
        _r_host = os.getenv('REDIS_HOST', 'localhost')
        _r_port = os.getenv('REDIS_PORT', '6379')
        _r_pass = os.getenv('REDIS_PASSWORD', '')
        _r_db   = os.getenv('REDIS_DB', '0')
        _r_auth = f':{_r_pass}@' if _r_pass else ''
        REDIS_URL = f'redis://{_r_auth}{_r_host}:{_r_port}/{_r_db}'
        
    if _WSL_IP and REDIS_URL:
        REDIS_URL = REDIS_URL.replace('localhost', _WSL_IP).replace('127.0.0.1', _WSL_IP)

    CACHE_REDIS_URL = os.getenv('CACHE_REDIS_URL') or REDIS_URL
    CACHE_TYPE = 'redis' if CACHE_REDIS_URL else 'simple'
    CACHE_IGNORE_ERRORS = True
    CACHE_DEFAULT_TIMEOUT = 300  # Reducido para frescura de datos
    CACHE_THRESHOLD = 5000  # Aumentado para mayor capacidad
    CACHE_KEY_PREFIX = 'villaluz:'  # Prefijo para evitar colisiones
    CACHE_REDIS_DB = int(os.getenv('CACHE_REDIS_DB', '0'))  # DB separada para cache
    CACHE_COMPRESSION = True  # Compresión para ahorrar memoria
    PERFORMANCE_MONITORING = True
    SLOW_QUERY_THRESHOLD = 0.5
    QUERY_CACHE_ENABLED = True
    QUERY_CACHE_TIMEOUT = 600
    QUERY_CACHE_MAX_SIZE = 500
    # SSE: límite de conexiones por IP (el endpoint /api/v1/events respeta este valor)
    SSE_MAX_CONN_PER_IP = int(os.getenv('SSE_MAX_CONN_PER_IP') or '50')
    SSE_MAX_CONN_PER_USER = int(os.getenv('SSE_MAX_CONN_PER_USER') or str(SSE_MAX_CONN_PER_IP))
    SSE_RETRY_MS = int(os.getenv('SSE_RETRY_MS') or '5000')
    SSE_COOLDOWN_SECONDS = int(os.getenv('SSE_COOLDOWN_SECONDS') or '15')
    SSE_PING_INTERVAL_SECONDS = int(os.getenv('SSE_PING_INTERVAL_SECONDS') or '25')

    # Activity feed caching (perfil/analytics)
    ACTIVITY_SUMMARY_CACHE_TTL = int(os.getenv('ACTIVITY_SUMMARY_CACHE_TTL', '60'))
    ACTIVITY_STATS_CACHE_TTL = int(os.getenv('ACTIVITY_STATS_CACHE_TTL', '60'))
    ACTIVITY_FILTERS_CACHE_TTL = int(os.getenv('ACTIVITY_FILTERS_CACHE_TTL', '120'))

    # -----------------------
    # Compresión
    # -----------------------
    COMPRESS_MIMETYPES = [
        'text/html', 'text/css', 'text/xml', 'application/json',
        'application/javascript', 'text/javascript', 'application/xml'
    ]
    COMPRESS_LEVEL = 6
    COMPRESS_MIN_SIZE = 500

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY es requerido en todos los entornos")

    JWT_TOKEN_LOCATION = ['cookies', 'headers']
    JWT_HEADER_NAME = 'Authorization'
    JWT_HEADER_TYPE = 'Bearer'
    JWT_COOKIE_HTTPONLY = True
    # IMPORTANT: nunca permitir nombres de cookie None/vacíos porque Werkzeug explota
    # cuando intenta hacer dump_cookie() con key=None.
    JWT_ACCESS_COOKIE_NAME = (os.getenv('JWT_ACCESS_COOKIE_NAME') or 'access_token_cookie').strip()
    JWT_REFRESH_COOKIE_NAME = (os.getenv('JWT_REFRESH_COOKIE_NAME') or 'refresh_token_cookie').strip()
    JWT_ACCESS_CSRF_COOKIE_NAME = (os.getenv('JWT_ACCESS_CSRF_COOKIE_NAME') or 'csrf_access_token').strip()
    JWT_REFRESH_CSRF_COOKIE_NAME = (os.getenv('JWT_REFRESH_CSRF_COOKIE_NAME') or 'csrf_refresh_token').strip()
    if not JWT_ACCESS_COOKIE_NAME or not JWT_REFRESH_COOKIE_NAME:
        raise ValueError("JWT_ACCESS_COOKIE_NAME y JWT_REFRESH_COOKIE_NAME no pueden estar vacíos")
    JWT_COOKIE_SAMESITE = os.getenv('JWT_COOKIE_SAMESITE', 'Lax')
    JWT_COOKIE_CSRF_PROTECT = os.getenv('JWT_COOKIE_CSRF_PROTECT', 'false').lower() == 'true'
    JWT_BLOCKLIST_ENABLED = True
    JWT_BLOCKLIST_TOKEN_CHECKS = ['access', 'refresh']

    # -----------------------
    # Bootstrap / Warmup (arranque)
    # -----------------------
    # Semilla de admin y warmup pueden disparar tormenta de conexiones al iniciar.
    SEED_ADMIN_ENABLED = _env_bool('SEED_ADMIN_ENABLED', default=False)
    CACHE_WARMUP_ENABLED = _env_bool('CACHE_WARMUP_ENABLED', default=False)
    CACHE_WARMUP_LIMIT = int(os.getenv('CACHE_WARMUP_LIMIT') or 10)


    # -----------------------
    # CORS
    # -----------------------
    CORS_ORIGINS = _parse_cors_origins_env() or []
    # Deprecated: usar solo CORS_ORIGINS desde .env; no se fusionan extras
    CORS_EXTRA_ORIGINS = []

    # -----------------------
    # Seguridad / JSON
    # -----------------------
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    JSON_SORT_KEYS = False
    JSON_AS_ASCII = False
    JSONIFY_PRETTYPRINT_REGULAR = False
    JSONIFY_MIMETYPE = 'application/json; charset=utf-8'

    # -----------------------
    # Uploads de Archivos
    # -----------------------
    UPLOAD_FOLDER = 'static/uploads'
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_IMAGE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp', 'gif'}
    MAX_IMAGES_PER_ANIMAL = 20

    # -----------------------
    # Celery
    # -----------------------
    CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL') or REDIS_URL
    CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND') or REDIS_URL

    # -----------------------
    # Rate Limiting
    # -----------------------
    RATE_LIMIT_STORAGE_URI = os.getenv('RATE_LIMIT_STORAGE_URI') or REDIS_URL
    RATE_LIMIT_ENABLED = True

    # -----------------------
    # Logging Seguridad
    # -----------------------
    SECURITY_LOG_ENABLED = True
    SECURITY_LOG_LEVEL = logging.INFO
    LOG_LEVEL = logging.INFO
    LOG_FILE_ENABLED = True

    # -----------------------
    # Flags de características
    # -----------------------
    # Permite habilitar la creación pública de usuarios incluso si ya existen
    # usuarios en la base de datos. Úsese con precaución.
    PUBLIC_USER_CREATION_ENABLED = os.getenv('PUBLIC_USER_CREATION_ENABLED', 'true').lower() == 'true'

    # -----------------------
    # Email (SMTP)
    # -----------------------
    EMAIL_ENABLED = _env_bool('EMAIL_ENABLED', default=True)
    SMTP_HOST = os.getenv('SMTP_HOST')
    SMTP_PORT = int(os.getenv('SMTP_PORT') or 587)
    SMTP_USERNAME = os.getenv('SMTP_USERNAME') or os.getenv('SMTP_USER')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD')
    SMTP_USE_TLS = _env_bool('SMTP_USE_TLS', default=True)
    SMTP_USE_SSL = _env_bool('SMTP_USE_SSL', default=False)
    SMTP_FROM_EMAIL = os.getenv('SMTP_FROM_EMAIL') or SMTP_USERNAME
    SMTP_FROM_NAME = os.getenv('SMTP_FROM_NAME') or ''
    SMTP_TIMEOUT = int(os.getenv('SMTP_TIMEOUT') or 10)
    PASSWORD_RESET_URL = os.getenv('PASSWORD_RESET_URL')
    FRONTEND_PASSWORD_RESET_PATH = os.getenv('FRONTEND_PASSWORD_RESET_PATH') or '/reset-password'

    # -----------------------
    # URLs
    # -----------------------
    API_BASE_URL = os.getenv('API_BASE_URL')
    API_HOST = os.getenv('API_HOST')
    API_PORT = os.getenv('API_PORT')
    API_PROTOCOL = os.getenv('API_PROTOCOL')
    FRONTEND_URL = os.getenv('FRONTEND_URL')
    FRONTEND_HOST = os.getenv('FRONTEND_HOST')
    FRONTEND_PORT = os.getenv('FRONTEND_PORT')
    FRONTEND_PROTOCOL = os.getenv('FRONTEND_PROTOCOL')
    BACKEND_URL = os.getenv('BACKEND_URL')
    BACKEND_HOST = os.getenv('BACKEND_HOST')
    BACKEND_PORT = os.getenv('BACKEND_PORT')
    BACKEND_PROTOCOL = os.getenv('BACKEND_PROTOCOL')
    # URL base sin /api/v1 — usada por file_storage, api_docs y otros
    API_BASE_URL_NO_VERSION = os.getenv('API_BASE_URL_NO_VERSION') or os.getenv('BACKEND_URL', '')
    API_DOCS_URL = os.getenv('API_DOCS_URL')
    API_SWAGGER_URL = os.getenv('API_SWAGGER_URL')

    # -----------------------
    # IA (Ollama — solo desarrollo)
    # -----------------------
    OLLAMA_URL = os.getenv('OLLAMA_URL', 'http://localhost:11434/api/generate')
    OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'llama3.2')

class DevelopmentConfig(Config):
    """Configuración para desarrollo (localhost)."""
    DEBUG = True
    LOG_LEVEL = logging.DEBUG
    RATE_LIMIT_ENABLED = False

    # JWT - Desarrollo local: respetar variables de entorno
    from os import getenv as _getenv
    JWT_COOKIE_SECURE = _getenv('JWT_COOKIE_SECURE', 'false').lower() == 'true'
    JWT_COOKIE_SAMESITE = _getenv('JWT_COOKIE_SAMESITE', 'Lax')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)

    # JWT_COOKIE_DOMAIN debe ser None para que el navegador use el dominio actual
    JWT_COOKIE_DOMAIN = None

    # Configuración adicional para desarrollo
    JWT_COOKIE_PATH = '/'

    # Plan B: permitir desactivar temporalmente la protección CSRF de cookies JWT para validar el flujo de refresh.
    # Usa DEV_JWT_COOKIE_CSRF_PROTECT=true para reactivar cuando terminemos la validación.
    JWT_COOKIE_CSRF_PROTECT = _getenv('DEV_JWT_COOKIE_CSRF_PROTECT') == 'true'
    # Permitir uso de JWT tanto en cookies como en encabezados para facilitar pruebas
    JWT_TOKEN_LOCATION = ['cookies', 'headers']

    # Allow small clock skew when decoding tokens to avoid "Signature has expired"
    # errors caused by minor time differences between clients and server.
    # Value is in seconds.
    JWT_DECODE_LEEWAY = 30

    # CORS - Solo desde variable de entorno
    CORS_ORIGINS = _parse_cors_origins_env() or []
    # SSE: en desarrollo, reducir el límite para forzar disciplina en el cliente
    SSE_MAX_CONN_PER_IP = int(os.getenv('SSE_MAX_CONN_PER_IP') or '10')
    SSE_MAX_CONN_PER_USER = int(os.getenv('SSE_MAX_CONN_PER_USER') or str(SSE_MAX_CONN_PER_IP))

class ProductionConfig(Config):
    """Configuración para producción (HTTPS)."""
    DEBUG = False
    LOG_LEVEL = logging.INFO

    # Configuraciones de seguridad más estrictas en producción
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024  # 8MB en producción (más restrictivo)

    # JWT - Atributos específicos de producción
    # JWT_COOKIE_SECURE debe ser True para HTTPS real.
    # Se puede sobreescribir con JWT_COOKIE_SECURE=false para entornos Docker locales sin HTTPS.
    _jwt_secure_env = os.getenv('JWT_COOKIE_SECURE', 'true').strip().lower()
    JWT_COOKIE_SECURE = _jwt_secure_env not in ('false', '0', 'no')
    JWT_COOKIE_SAMESITE = os.getenv('JWT_COOKIE_SAMESITE', 'Lax')
    # Importante: no forzar un dominio fijo. Debe venir del entorno
    # para coincidir con el dominio real desplegado (p. ej. .enlinea.sbs).
    # Si no se define, wsgi.py abortará el arranque en producción.
    JWT_COOKIE_DOMAIN = os.getenv('JWT_COOKIE_DOMAIN')
    JWT_TOKEN_LOCATION = ['cookies', 'headers']  # Usar cookies y headers para JWT
    JWT_COOKIE_CSRF_PROTECT = True  # Proteger cookies JWT con CSRF (recomendado en producción)

    # CORS - Solo desde variable de entorno
    CORS_ORIGINS = _parse_cors_origins_env() or []

    # Pool de PostgreSQL: cada worker obtiene su propia copia (preload).
    # Con 5 workers y max_connections=50 en PG → 50/5 = 10 por worker.
    # pool_size=8 + max_overflow=2 = 10 por worker, justo en el límite.
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': int(os.getenv('DB_POOL_SIZE', '8')),
        'max_overflow': int(os.getenv('DB_MAX_OVERFLOW', '2')),
        'pool_timeout': 45,
        'pool_recycle': 900,
        'pool_pre_ping': True
    }

    @classmethod
    def validate_production_env(cls):
        """Valida variables de entorno requeridas para producción"""
        if not os.getenv('JWT_SECRET_KEY'):
            raise ValueError("La variable JWT_SECRET_KEY DEBE estar definida en producción.")
        if not os.getenv('JWT_COOKIE_DOMAIN'):
            raise ValueError("La variable JWT_COOKIE_DOMAIN DEBE estar definida en producción.")

    # El dominio de la cookie debe ser el dominio principal (con punto inicial)
    # para que sea válido en cualquier subdominio
    JWT_COOKIE_DOMAIN = os.getenv('JWT_COOKIE_DOMAIN')

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    # Allow a small leeway for token decoding to tolerate minor clock skew.
    # Production servers should have accurate time (NTP) configured.
class TestingConfig(Config):
    """Configuración específica para pruebas (aislada de producción)."""
    TESTING = True
    # Forzar uso de SQLite en memoria para pruebas si no se especifica una URI de test explícita
    # para evitar borrar la base de datos de producción por accidente.
    SQLALCHEMY_DATABASE_URI = os.getenv('TEST_SQLALCHEMY_DATABASE_URI') or 'sqlite:///:memory:'
    JWT_COOKIE_CSRF_PROTECT = False
    SQLALCHEMY_ENGINE_OPTIONS = {}
    DEBUG = False
    LOG_LEVEL = logging.DEBUG
    RATE_LIMIT_ENABLED = True
    # Permitir tanto cookies como headers en testing para E2E de Playwright
    JWT_TOKEN_LOCATION = ['cookies', 'headers']
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_SAMESITE = 'Lax'
    JWT_COOKIE_DOMAIN = None
    JWT_COOKIE_PATH = '/'
    CORS_ORIGINS = ['https://localhost:3005', 'https://127.0.0.1:3005', 'http://localhost:3005', 'http://127.0.0.1:3005', 'http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:5000']
    # Permitir usar una BD distinta en pruebas por defecto (db 2)
    REDIS_URL = os.getenv('TEST_REDIS_URL')
    CACHE_REDIS_URL = os.getenv('TEST_CACHE_REDIS_URL') or REDIS_URL
    CACHE_TYPE = 'redis' if CACHE_REDIS_URL else 'simple'
    RATE_LIMIT_STORAGE_URI = os.getenv('TEST_RATE_LIMIT_STORAGE_URI')


# Diccionario de configuración final
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
