"""
Configuración de CORS y hooks auxiliares.
"""
import flask
from flask_cors import CORS
import logging
import re
from urllib.parse import urlparse

_LOCALHOST_REGEX = re.compile(r'^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$')

def _is_localhost(origin: str) -> bool:
    if not origin:
        return False
    try:
        parsed = urlparse(origin)
        hostname = parsed.hostname or ''
        return hostname == 'localhost' or hostname == '127.0.0.1' or hostname in ('[::1]', '::1')
    except Exception:
        return False



def _sanitize_origins(origins):
    raw_origins = origins or []
    sanitized = []
    for o in raw_origins:
        if not isinstance(o, str):
            continue
        s = o.strip()
        if s and s[0] in ("'", '"', '`') and s[-1:] == s[0] and len(s) >= 2:
            s = s[1:-1].strip()
        s = s.strip('`')
        if s:
            sanitized.append(s)
    # Deduplicar preservando orden
    seen = set()
    deduped = []
    for origin in sanitized:
        if origin not in seen:
            deduped.append(origin)
            seen.add(origin)
    return deduped


def init_cors(app, logger: logging.Logger = None):
    """Inicializa CORS, handlers de preflight y logging relacionado."""
    logger = logger or logging.getLogger(__name__)

    # Usar exclusivamente los orígenes definidos en app.config['CORS_ORIGINS']
    try:
        app.config['CORS_ORIGINS'] = _sanitize_origins(app.config.get('CORS_ORIGINS', []) or [])
    except Exception:
        pass

    # Configura CORS con los orígenes y la regex de localhost
    origins = app.config.get('CORS_ORIGINS', []) or []
    CORS(
        app,
        origins=list(origins) + [_LOCALHOST_REGEX],
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "Origin",
            "Cache-Control",
            "X-File-Name",
            "X-CSRF-Token",
            "X-CSRF-TOKEN",  # variante en mayúsculas usada por Swagger/otros clientes
            "X-App-Version",
            "X-Client-Timezone",
            "X-Client-Locale",
        ],
        expose_headers=[
            "Content-Range",
            "X-Content-Range",
            "X-Total-Count",
            "Authorization",
            "ETag",
            "Last-Modified",
            "Cache-Control",
            "X-API-Version",
            "X-Cache-Strategy",
            "X-Has-More",
            "Vary"
        ],
        supports_credentials=True,
        max_age=86400
    )

    # Log detallado de CORS para depuración y manejo explícito de preflight
    @app.before_request
    def _handle_cors_preflight():
        if flask.request.method == "OPTIONS":
            logger.debug(
                "CORS preflight -> path: %s, origin: %s, req-method: %s, req-headers: %s",
                flask.request.path,
                flask.request.headers.get('Origin'),
                flask.request.headers.get('Access-Control-Request-Method'),
                flask.request.headers.get('Access-Control-Request-Headers'),
            )
            res = flask.make_response()
            origin = flask.request.headers.get('Origin')
            allowed_origins = flask.current_app.config.get('CORS_ORIGINS', []) or []
            if origin and (origin in allowed_origins or _is_localhost(origin)):
                res.headers.add('Access-Control-Allow-Origin', origin)
            req_headers = flask.request.headers.get('Access-Control-Request-Headers')
            if req_headers:
                res.headers.add('Access-Control-Allow-Headers', req_headers)
            allowed_methods = flask.current_app.config.get('CORS_METHODS', ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"])
            res.headers.add('Access-Control-Allow-Methods', ', '.join(allowed_methods))
            res.headers.add('Access-Control-Allow-Credentials', 'true')
            res.headers.add('Access-Control-Max-Age', str(flask.current_app.config.get('CORS_MAX_AGE', 86400)))
            res.headers.add('Vary', 'Origin')
            return res

    @app.after_request
    def _add_cors_headers_and_log(response):
        def _merge_vary(value: str):
            existing = response.headers.get('Vary')
            parts = []
            if existing:
                parts.extend([p.strip() for p in existing.split(',') if p.strip()])
            parts.extend([p.strip() for p in (value or '').split(',') if p.strip()])
            seen = set()
            merged = []
            for p in parts:
                if p not in seen:
                    merged.append(p)
                    seen.add(p)
            if merged:
                response.headers['Vary'] = ', '.join(merged)

        origin = flask.request.headers.get('Origin')
        allowed_origins = flask.current_app.config.get('CORS_ORIGINS', []) or []
        if origin and (origin in allowed_origins or _is_localhost(origin)):
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            _merge_vary('Origin')
        elif origin and origin not in allowed_origins:
            logger.warning(
                "CORS: Origin %s no está en CORS_ORIGINS. Agregue '%s' a la variable CORS_ORIGINS en .env",
                origin,
                origin
            )
        if flask.request.method != 'OPTIONS':
            logger.debug(
                "Response -> path: %s, status: %s, origin: %s, A-C-Allow-Origin: %s",
                flask.request.path,
                response.status,
                origin,
                response.headers.get('Access-Control-Allow-Origin'),
            )
        return response

    # Log de configuración CORS/JWT para facilitar el diagnóstico en arranque
    try:
        allowed_origins = app.config.get('CORS_ORIGINS', [])
        logger.info(f"CORS habilitado. Orígenes permitidos (solo .env): {allowed_origins}")
        logger.info(
            "CORS detalles -> supports_credentials: %s, methods: %s, allow_headers: %s, expose_headers: %s, max_age: %s",
            True,
            ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"],
            [
                "Content-Type", "Authorization", "X-Requested-With", "Accept",
                "Origin", "Cache-Control", "X-File-Name", "X-CSRF-Token", "X-CSRF-TOKEN",
                "X-App-Version", "X-Client-Timezone", "X-Client-Locale"
            ],
            ["Content-Range", "X-Content-Range", "X-Total-Count", "Authorization"],
            86400,
        )
        logger.info(
            "JWT cookies -> domain: %s, secure: %s, samesite: %s, token_location: %s",
            app.config.get('JWT_COOKIE_DOMAIN'),
            app.config.get('JWT_COOKIE_SECURE'),
            app.config.get('JWT_COOKIE_SAMESITE'),
            app.config.get('JWT_TOKEN_LOCATION'),
        )
    except Exception as e:
        logger.warning(f"No se pudo registrar configuración CORS/JWT en logs: {e}")
