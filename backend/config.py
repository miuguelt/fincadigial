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
_ROOT_ENV_FILE = _PROJECT_ROOT / ".env"
load_dotenv(dotenv_path=_ROOT_ENV_FILE, override=False)


def _get_wsl_ip():
    """Keep the local runtime strictly Windows-native.

    WSL support was removed from the development topology. Keeping this helper
    as a no-op preserves compatibility with older imports without allowing an
    inherited ``WSL_HOST_IP`` to rewrite native loopback URLs.
    """
    return None


_WSL_IP = _get_wsl_ip()


# Helper para parsear CORS_ORIGINS desde variables de entorno (.env)
# Admite formato JSON (p.ej. ["https://a.com","http://b.com"]) o CSV (a.com,b.com)
# Retorna una lista de strings o None si no se definió.
def _parse_cors_origins_env():
    raw = os.getenv("CORS_ORIGINS")
    if not raw:
        return None
    try:
        raw_stripped = raw.strip()
        # Si es JSON array
        if raw_stripped.startswith("["):
            import json as _json

            data = _json.loads(raw_stripped)
            if isinstance(data, list):
                items = []
                for x in data:
                    if not isinstance(x, str):
                        x = str(x)
                    s = x.strip().strip("\"'`").strip("`")
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
    items = [s.strip().strip("\"'`").strip("`") for s in raw.split(",")]
    items = [s for s in items if s]
    seen = set()
    deduped = []
    for it in items:
        if it not in seen:
            deduped.append(it)
            seen.add(it)
    return deduped or None


def _build_sqlalchemy_database_uri():
    """Build SQLALCHEMY_DATABASE_URI primarily from DATABASE_URL."""
    uri = os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URI")
    if uri:
        # Normalizar prefijos genéricos de postgres
        if uri.startswith("postgres://"):
            uri = uri.replace("postgres://", "postgresql+psycopg2://", 1)
        elif uri.startswith("postgresql://") and not uri.startswith("postgresql+"):
            uri = uri.replace("postgresql://", "postgresql+psycopg2://", 1)
        return uri

    # En desarrollo local permitimos una base SQLite auto-contenida para no
    # depender de un PostgreSQL externo cuando solo se quiere levantar la API.
    dev_uri = os.getenv("DEV_DATABASE_URL")
    active_env = (
        (os.getenv("FLASK_ENV") or os.getenv("FLASK_CONFIG") or "development")
        .strip()
        .lower()
    )
    if active_env == "development" and dev_uri:
        return dev_uri

    # Fallback legacy para desarrollo local si aún existen variables separadas
    host = os.getenv("DB_HOST")
    name = os.getenv("DB_NAME")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")

    if all([host, name, user, password]):
        default_engine = "postgresql+psycopg2" if active_env == "production" else "mysql+pymysql"
        engine = os.getenv("DB_ENGINE", default_engine)
        default_port = "5432" if "postgresql" in engine else "3306"
        port = os.getenv("DB_PORT") or default_port
        try:
            safe_user = quote_plus(str(user))
            safe_password = quote_plus(str(password))
        except Exception:
            safe_user = str(user)
            safe_password = str(password)
        return f"{engine}://{safe_user}:{safe_password}@{host}:{port}/{name}"

    return None


def _env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


class Config:
    API_MAX_PAGE_SIZE = int(os.getenv("API_MAX_PAGE_SIZE", "500"))
    """Configuración base de la aplicación. Aplica a todos los entornos."""

    # -----------------------
    # Base de Datos (SSoT: DATABASE_URL contiene host, puerto, user, pass y db)
    # -----------------------
    SQLALCHEMY_DATABASE_URI = _build_sqlalchemy_database_uri()
    if not SQLALCHEMY_DATABASE_URI:
        raise ValueError(
            "DATABASE_URL es requerido para conectar a la base de datos."
        )

    # Extraer atributos de conexión directamente desde la URL (sin pedir variables separadas)
    try:
        from urllib.parse import urlsplit as _urlsplit, unquote as _unquote
        _parsed_db = _urlsplit(SQLALCHEMY_DATABASE_URI.replace("postgresql+psycopg2://", "postgresql://", 1))
        HOST = _parsed_db.hostname or "localhost"
        PORT = str(_parsed_db.port or 5432)
        DATABASE = _parsed_db.path.lstrip("/") or "villaluz"
        DB_USER = _unquote(_parsed_db.username or "")
        DB_PASSWORD = _unquote(_parsed_db.password or "")
    except Exception:
        HOST = os.getenv("DB_HOST", "localhost")
        PORT = os.getenv("DB_PORT", "5432")
        DATABASE = os.getenv("DB_NAME", "villaluz")
        DB_USER = os.getenv("DB_USER", "")
        DB_PASSWORD = os.getenv("DB_PASSWORD", "")

    DB_DRIVER = "psycopg2"
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Optimizaciones Pro para PostgreSQL 18 y alta concurrencia
    SQLALCHEMY_ENGINE_OPTIONS: dict[str, Any] = {
        "pool_size": int(os.getenv("DB_POOL_SIZE", "20")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "40")),
        "pool_timeout": 30,
        "pool_recycle": 1800,
        "pool_pre_ping": True,
        "echo": False,
        "pool_reset_on_return": "commit",
    }

    # Serializador JSON de alto rendimiento si está disponible
    try:
        import orjson as _orjson

        SQLALCHEMY_ENGINE_OPTIONS["json_serializer"] = (
            lambda obj, _json_module=_orjson: _json_module.dumps(obj).decode()
        )
        SQLALCHEMY_ENGINE_OPTIONS["json_deserializer"] = _orjson.loads
    except ImportError:
        try:
            import ujson

            SQLALCHEMY_ENGINE_OPTIONS["json_serializer"] = ujson.dumps
            SQLALCHEMY_ENGINE_OPTIONS["json_deserializer"] = ujson.loads
        except ImportError:
            pass

    # Configurar connect_args dinámicamente según el motor
    _connect_args: dict[str, Any] = {
        "connect_timeout": 60,
    }

    if SQLALCHEMY_DATABASE_URI and "mysql" in SQLALCHEMY_DATABASE_URI:
        _connect_args.update(
            {
                "charset": "utf8mb4",
                "sql_mode": "STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO",
            }
        )
    elif SQLALCHEMY_DATABASE_URI and "postgresql" in SQLALCHEMY_DATABASE_URI:
        # Optimizaciones específicas para PostgreSQL 18
        _connect_args.update(
            {
                "application_name": "villaluz_api_pro",
                "options": "-c statement_timeout=30000 -c lock_timeout=10000",  # 30s timeout de ejecución, 10s para bloqueos
                "keepalives": 1,
                "keepalives_idle": 30,
                "keepalives_interval": 10,
                "keepalives_count": 5,
            }
        )

    SQLALCHEMY_ENGINE_OPTIONS["connect_args"] = _connect_args

    # Si se usa SQLite, eliminar opciones de pool incompatibles
    _maybe_db_uri = SQLALCHEMY_DATABASE_URI
    if isinstance(_maybe_db_uri, str) and _maybe_db_uri.startswith("sqlite"):
        SQLALCHEMY_ENGINE_OPTIONS = {}

    # -----------------------
    # Cache & Rendimiento
    # -----------------------
    # Redis — Construcción inteligente: usa REDIS_URL directa si existe.
    # En desarrollo/testing se usa fallback a Memurai local (127.0.0.1:6380).
    # En producción sin REDIS_URL explícito, se deja en None para operar en modo resiliente sin errores.
    _active_env = (
        os.getenv("FLASK_ENV") or os.getenv("FLASK_CONFIG") or "development"
    ).strip().lower()
    REDIS_URL = os.getenv("REDIS_URL")
    if not REDIS_URL:
        if _active_env in {"development", "testing"}:
            _r_host = os.getenv("REDIS_HOST", "127.0.0.1")
            _r_port = os.getenv("REDIS_PORT", "6380")
            _r_pass = os.getenv("REDIS_PASSWORD", "")
            _r_db = os.getenv("REDIS_DB", "0")
            _r_auth = f":{_r_pass}@" if _r_pass else ""
            REDIS_URL = f"redis://{_r_auth}{_r_host}:{_r_port}/{_r_db}"
        else:
            REDIS_URL = None

    # Local development is Windows-native. Normalize the loopback alias so a
    # machine resolving ``localhost`` to IPv6 cannot bypass Memurai's IPv4
    # listener on 127.0.0.1:6380.
    if (
        _active_env in {"development", "testing"}
        and REDIS_URL
    ):
        REDIS_URL = REDIS_URL.replace("://localhost:", "://127.0.0.1:")

    if _WSL_IP and REDIS_URL:
        REDIS_URL = REDIS_URL.replace("localhost", _WSL_IP).replace(
            "127.0.0.1", _WSL_IP
        )

    CACHE_REDIS_URL = os.getenv("CACHE_REDIS_URL") or REDIS_URL
    CACHE_TYPE = "redis" if CACHE_REDIS_URL else "simple"
    CACHE_IGNORE_ERRORS = True
    CACHE_DEFAULT_TIMEOUT = 300  # Reducido para frescura de datos
    CACHE_THRESHOLD = 5000  # Aumentado para mayor capacidad
    CACHE_KEY_PREFIX = "villaluz:"  # Prefijo para evitar colisiones
    CACHE_REDIS_DB = int(os.getenv("CACHE_REDIS_DB", "0"))  # DB separada para cache
    CACHE_COMPRESSION = True  # Compresión para ahorrar memoria
    PERFORMANCE_MONITORING = True
    SLOW_QUERY_THRESHOLD = 0.5
    QUERY_CACHE_ENABLED = True
    QUERY_CACHE_TIMEOUT = 600
    QUERY_CACHE_MAX_SIZE = 500
    # SSE: límite de conexiones por IP (el endpoint /api/v1/events respeta este valor)
    SSE_MAX_CONN_PER_IP = int(os.getenv("SSE_MAX_CONN_PER_IP") or "50")
    SSE_MAX_CONN_PER_USER = int(
        os.getenv("SSE_MAX_CONN_PER_USER") or str(SSE_MAX_CONN_PER_IP)
    )
    SSE_RETRY_MS = int(os.getenv("SSE_RETRY_MS") or "5000")
    SSE_COOLDOWN_SECONDS = int(os.getenv("SSE_COOLDOWN_SECONDS") or "15")
    SSE_PING_INTERVAL_SECONDS = int(os.getenv("SSE_PING_INTERVAL_SECONDS") or "25")

    # Activity feed caching (perfil/analytics)
    ACTIVITY_SUMMARY_CACHE_TTL = int(os.getenv("ACTIVITY_SUMMARY_CACHE_TTL", "60"))
    ACTIVITY_STATS_CACHE_TTL = int(os.getenv("ACTIVITY_STATS_CACHE_TTL", "60"))
    ACTIVITY_FILTERS_CACHE_TTL = int(os.getenv("ACTIVITY_FILTERS_CACHE_TTL", "120"))

    # -----------------------
    # Compresión
    # -----------------------
    COMPRESS_MIMETYPES = [
        "text/html",
        "text/css",
        "text/xml",
        "application/json",
        "application/javascript",
        "text/javascript",
        "application/xml",
    ]
    COMPRESS_LEVEL = 6
    COMPRESS_MIN_SIZE = 500

    JWT_SECRET_KEY = (
        os.getenv("JWT_SECRET_KEY")
        or os.getenv("FLASK_SECRET_KEY")
        or os.getenv("SECRET_KEY")
    )
    if not JWT_SECRET_KEY:
        raise ValueError("JWT_SECRET_KEY o FLASK_SECRET_KEY es requerido en todos los entornos")

    JWT_TOKEN_LOCATION = ["cookies", "headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"
    JWT_COOKIE_HTTPONLY = True
    # IMPORTANT: nunca permitir nombres de cookie None/vacíos porque Werkzeug explota
    # cuando intenta hacer dump_cookie() con key=None.
    JWT_ACCESS_COOKIE_NAME = (
        os.getenv("JWT_ACCESS_COOKIE_NAME") or "access_token_cookie"
    ).strip()
    JWT_REFRESH_COOKIE_NAME = (
        os.getenv("JWT_REFRESH_COOKIE_NAME") or "refresh_token_cookie"
    ).strip()
    JWT_ACCESS_CSRF_COOKIE_NAME = (
        os.getenv("JWT_ACCESS_CSRF_COOKIE_NAME") or "csrf_access_token"
    ).strip()
    JWT_REFRESH_CSRF_COOKIE_NAME = (
        os.getenv("JWT_REFRESH_CSRF_COOKIE_NAME") or "csrf_refresh_token"
    ).strip()
    if not JWT_ACCESS_COOKIE_NAME or not JWT_REFRESH_COOKIE_NAME:
        raise ValueError(
            "JWT_ACCESS_COOKIE_NAME y JWT_REFRESH_COOKIE_NAME no pueden estar vacíos"
        )
    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")
    JWT_COOKIE_CSRF_PROTECT = (
        os.getenv("JWT_COOKIE_CSRF_PROTECT", "false").lower() == "true"
    )
    JWT_BLOCKLIST_ENABLED = True
    JWT_BLOCKLIST_TOKEN_CHECKS = ["access", "refresh"]

    # -----------------------
    # Bootstrap / Warmup (arranque)
    # -----------------------
    # Semilla de admin y warmup pueden disparar tormenta de conexiones al iniciar.
    SEED_ADMIN_ENABLED = _env_bool("SEED_ADMIN_ENABLED", default=False)
    CACHE_WARMUP_ENABLED = _env_bool("CACHE_WARMUP_ENABLED", default=False)
    CACHE_WARMUP_LIMIT = int(os.getenv("CACHE_WARMUP_LIMIT") or 10)

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
    JSONIFY_MIMETYPE = "application/json; charset=utf-8"

    # -----------------------
    # Uploads de Archivos
    # -----------------------
    UPLOAD_FOLDER = "static/uploads"
    MAX_IMAGE_SIZE = 5 * 1024 * 1024  # 5MB
    ALLOWED_IMAGE_EXTENSIONS = {"jpg", "jpeg", "png", "webp", "gif"}
    MAX_IMAGES_PER_ANIMAL = 20

    # -----------------------
    # Celery
    # -----------------------
    _CELERY_REDIS_URL = REDIS_URL.rsplit("/", 1)[0] + "/1" if REDIS_URL else REDIS_URL
    CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL") or _CELERY_REDIS_URL
    CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND") or _CELERY_REDIS_URL

    # Health-check probe. ``control.inspect()`` is a broker broadcast that burns
    # its full timeout unless ``limit`` is reached first, so keep the expected
    # worker count in sync with the deployment or /health slows down again.
    CELERY_INSPECT_TIMEOUT = float(os.getenv("CELERY_INSPECT_TIMEOUT", "1.5"))
    CELERY_STATUS_TTL_SECONDS = float(os.getenv("CELERY_STATUS_TTL_SECONDS", "30"))
    CELERY_EXPECTED_WORKERS = int(os.getenv("CELERY_EXPECTED_WORKERS", "1"))

    # -----------------------
    # Rate Limiting
    # -----------------------
    RATE_LIMIT_STORAGE_URI = os.getenv("RATE_LIMIT_STORAGE_URI") or REDIS_URL
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
    PUBLIC_USER_CREATION_ENABLED = (
        os.getenv("PUBLIC_USER_CREATION_ENABLED", "true").lower() == "true"
    )

    # -----------------------
    # Email (SMTP)
    # -----------------------
    EMAIL_ENABLED = _env_bool("EMAIL_ENABLED", default=True)
    SMTP_HOST = os.getenv("SMTP_HOST")
    SMTP_PORT = int(os.getenv("SMTP_PORT") or 587)
    SMTP_USERNAME = os.getenv("SMTP_USERNAME") or os.getenv("SMTP_USER")
    SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
    SMTP_USE_TLS = _env_bool("SMTP_USE_TLS", default=True)
    SMTP_USE_SSL = _env_bool("SMTP_USE_SSL", default=False)
    SMTP_FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL") or SMTP_USERNAME
    SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME") or ""
    SMTP_TIMEOUT = int(os.getenv("SMTP_TIMEOUT") or 10)
    PASSWORD_RESET_URL = os.getenv("PASSWORD_RESET_URL")
    FRONTEND_PASSWORD_RESET_PATH = (
        os.getenv("FRONTEND_PASSWORD_RESET_PATH") or "/reset-password"
    )

    # -----------------------
    # URLs
    # -----------------------
    _domain = (os.getenv("DOMAIN") or "").strip()
    _scheme = (os.getenv("PREFERRED_URL_SCHEME") or "https").strip()
    _default_base_url = f"{_scheme}://{_domain}" if _domain else ""

    API_BASE_URL = os.getenv("API_BASE_URL") or (f"{_default_base_url}/api/v1" if _default_base_url else None)
    API_HOST = os.getenv("API_HOST")
    API_PORT = os.getenv("API_PORT")
    API_PROTOCOL = os.getenv("API_PROTOCOL")
    FRONTEND_URL = os.getenv("FRONTEND_URL") or (_default_base_url if _default_base_url else None)
    FRONTEND_HOST = os.getenv("FRONTEND_HOST")
    FRONTEND_PORT = os.getenv("FRONTEND_PORT")
    FRONTEND_PROTOCOL = os.getenv("FRONTEND_PROTOCOL")
    BACKEND_URL = os.getenv("BACKEND_URL") or (_default_base_url if _default_base_url else None)
    BACKEND_HOST = os.getenv("BACKEND_HOST")
    BACKEND_PORT = os.getenv("BACKEND_PORT")
    BACKEND_PROTOCOL = os.getenv("BACKEND_PROTOCOL")
    # URL base sin /api/v1 — usada por file_storage, api_docs y otros
    API_BASE_URL_NO_VERSION = (
        os.getenv("API_BASE_URL_NO_VERSION")
        or os.getenv("BACKEND_URL")
        or (_default_base_url if _default_base_url else "")
    )
    API_DOCS_URL = os.getenv("API_DOCS_URL")
    API_SWAGGER_URL = os.getenv("API_SWAGGER_URL")

    # -----------------------
    # IA (Ollama — solo desarrollo)
    # -----------------------
    OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
    OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


class DevelopmentConfig(Config):
    """Configuración para desarrollo (localhost)."""

    DEBUG = True
    LOG_LEVEL = logging.DEBUG
    RATE_LIMIT_ENABLED = False

    # JWT - Desarrollo local: respetar variables de entorno
    from os import getenv as _getenv

    JWT_COOKIE_SECURE = _getenv("JWT_COOKIE_SECURE", "false").lower() == "true"
    JWT_COOKIE_SAMESITE = _getenv("JWT_COOKIE_SAMESITE", "Lax")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=2)

    # JWT_COOKIE_DOMAIN debe ser None para que el navegador use el dominio actual
    JWT_COOKIE_DOMAIN = None

    # Configuración adicional para desarrollo
    JWT_COOKIE_PATH = "/"

    # Plan B: permitir desactivar temporalmente la protección CSRF de cookies JWT para validar el flujo de refresh.
    # Usa DEV_JWT_COOKIE_CSRF_PROTECT=true para reactivar cuando terminemos la validación.
    JWT_COOKIE_CSRF_PROTECT = _getenv("DEV_JWT_COOKIE_CSRF_PROTECT") == "true"
    # Permitir uso de JWT tanto en cookies como en encabezados para facilitar pruebas
    JWT_TOKEN_LOCATION = ["cookies", "headers"]

    # Allow small clock skew when decoding tokens to avoid "Signature has expired"
    # errors caused by minor time differences between clients and server.
    # Value is in seconds.
    JWT_DECODE_LEEWAY = 30

    # CORS - Solo desde variable de entorno
    CORS_ORIGINS = _parse_cors_origins_env() or []
    # SSE: en desarrollo, reducir el límite para forzar disciplina en el cliente
    SSE_MAX_CONN_PER_IP = int(os.getenv("SSE_MAX_CONN_PER_IP") or "10")
    SSE_MAX_CONN_PER_USER = int(
        os.getenv("SSE_MAX_CONN_PER_USER") or str(SSE_MAX_CONN_PER_IP)
    )


class ProductionConfig(Config):
    """Configuración para producción (HTTPS)."""

    DEBUG = False
    LOG_LEVEL = logging.INFO

    # Configuraciones de seguridad más estrictas en producción
    MAX_CONTENT_LENGTH = 8 * 1024 * 1024  # 8MB en producción (más restrictivo)

    # JWT - Atributos específicos de producción
    # JWT_COOKIE_SECURE debe ser True para HTTPS real.
    # Se puede sobreescribir con JWT_COOKIE_SECURE=false para entornos Docker locales sin HTTPS.
    _jwt_secure_env = os.getenv("JWT_COOKIE_SECURE", "true").strip().lower()
    JWT_COOKIE_SECURE = _jwt_secure_env not in ("false", "0", "no")
    JWT_COOKIE_SAMESITE = os.getenv("JWT_COOKIE_SAMESITE", "Lax")
    # Dominio de la cookie: toma JWT_COOKIE_DOMAIN o hereda automáticamente de DOMAIN
    JWT_COOKIE_DOMAIN = os.getenv("JWT_COOKIE_DOMAIN") or os.getenv("DOMAIN")
    JWT_TOKEN_LOCATION = ["cookies", "headers"]  # Usar cookies y headers para JWT
    JWT_COOKIE_CSRF_PROTECT = (
        True  # Proteger cookies JWT con CSRF (recomendado en producción)
    )

    # CORS - Desde variable o derivado automáticamente de DOMAIN
    _raw_cors = _parse_cors_origins_env()
    if not _raw_cors and os.getenv("DOMAIN"):
        _dom = os.getenv("DOMAIN")
        _raw_cors = [f"https://{_dom}", f"https://www.{_dom}"]
    CORS_ORIGINS = _raw_cors or []

    # Pool de PostgreSQL: cada worker obtiene su propia copia (preload).
    # The Coolify profile uses two gevent workers and a small PostgreSQL
    # max_connections budget. Keep headroom for migrations, backups and jobs.
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": int(os.getenv("DB_POOL_SIZE", "4")),
        "max_overflow": int(os.getenv("DB_MAX_OVERFLOW", "1")),
        "pool_timeout": int(os.getenv("DB_POOL_TIMEOUT", "20")),
        "pool_recycle": 900,
        "pool_pre_ping": True,
    }

    @classmethod
    def validate_production_env(cls):
        """Valida las 5 variables de entorno obligatorias para producción según el protocolo SSoT."""
        missing = []
        if not (os.getenv("DATABASE_URL") or os.getenv("SQLALCHEMY_DATABASE_URI")):
            missing.append("DATABASE_URL")
        if not (os.getenv("FLASK_SECRET_KEY") or os.getenv("JWT_SECRET_KEY")):
            missing.append("FLASK_SECRET_KEY")
        if not (os.getenv("DOMAIN") or os.getenv("JWT_COOKIE_DOMAIN")):
            missing.append("DOMAIN")
        if not os.getenv("VILLALUZ_ADMIN_EMAIL"):
            missing.append("VILLALUZ_ADMIN_EMAIL")
        if not os.getenv("VILLALUZ_ADMIN_PASSWORD"):
            missing.append("VILLALUZ_ADMIN_PASSWORD")

        if missing:
            raise ValueError(
                f"Faltan variables obligatorias de producción en Coolify: {', '.join(missing)}. "
                f"Consulte el protocolo de mínimas variables SSoT."
            )

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=7)

    # Allow a small leeway for token decoding to tolerate minor clock skew.
    # Production servers should have accurate time (NTP) configured.


class TestingConfig(Config):
    """Configuración específica para pruebas (aislada de producción)."""

    TESTING = True
    # Forzar uso de SQLite en memoria para pruebas si no se especifica una URI de test explícita
    # para evitar borrar la base de datos de producción por accidente.
    SQLALCHEMY_DATABASE_URI = (
        os.getenv("TEST_SQLALCHEMY_DATABASE_URI") or "sqlite:///:memory:"
    )
    JWT_COOKIE_CSRF_PROTECT = False
    SQLALCHEMY_ENGINE_OPTIONS = {}
    DEBUG = False
    LOG_LEVEL = logging.DEBUG
    RATE_LIMIT_ENABLED = True
    # Permitir tanto cookies como headers en testing para E2E de Playwright
    JWT_TOKEN_LOCATION = ["cookies", "headers"]
    JWT_COOKIE_SECURE = False
    JWT_COOKIE_SAMESITE = "Lax"
    JWT_COOKIE_DOMAIN = None
    JWT_COOKIE_PATH = "/"
    CORS_ORIGINS = [
        "https://localhost:3005",
        "https://127.0.0.1:3005",
        "http://localhost:3005",
        "http://127.0.0.1:3005",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:5000",
    ]
    # Permitir usar una BD distinta en pruebas por defecto (db 2)
    REDIS_URL = os.getenv("TEST_REDIS_URL")
    CACHE_REDIS_URL = os.getenv("TEST_CACHE_REDIS_URL") or REDIS_URL
    CACHE_TYPE = "redis" if CACHE_REDIS_URL else "simple"
    RATE_LIMIT_STORAGE_URI = os.getenv("TEST_RATE_LIMIT_STORAGE_URI")


# Diccionario de configuración final
config = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}
