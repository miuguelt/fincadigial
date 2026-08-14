"""
Middlewares de seguridad y utilidades asociadas.
"""
import logging
import flask
from flask_jwt_extended import verify_jwt_in_request
from app.utils.response_handler import APIResponse


def init_security_middlewares(app):
    logger = logging.getLogger('app.auth')

    @app.before_request
    def handle_aliases_and_protection():
        raw_path = flask.request.path or ''

        # Lista blanca de rutas públicas (Bypass de seguridad)
        public_paths = [
            '/api/v1/auth/login',
            '/api/v1/auth/refresh',
            '/api/v1/auth/logout',
            '/api/v1/enums',
            '/api/v1/health',
            '/api/v1/docs',
            '/api/v1/public/',
            '/api/v1/push/vapid-public-key',
            '/api/v1/users/public',
            # Public finca directory: browsable before joining a finca.
            # Each resource still declares its own @jwt_required; only the
            # listing endpoints use jwt_required(optional=True).
            '/api/v1/fincas/public',
            '/api/v1/finca-images',
            '/api/v1/knowledge_base/test',
            '/api/test-exceptions',
        ]

        # Verificar si la ruta es pública
        is_public = any(raw_path.startswith(p) for p in public_paths)

        # Rutas raíz (exactas)
        if raw_path in ['/api/v1/', '/api/v1', '/', '']:
            is_public = True

        if '/docs/' in raw_path or 'swagger' in raw_path.lower():
            is_public = True

        if not is_public:
            try:
                # Verificación de JWT para rutas no públicas
                verify_jwt_in_request()
            except Exception as e:
                logger.warning(f"JWT Verification failed for {raw_path}: {e}")
                body, status = APIResponse.error(
                    message="Token ausente o inválido",
                    status_code=401,
                    error_code="JWT_ERROR",
                    details={'path': raw_path}
                )
                import json
                return flask.Response(
                    response=json.dumps(body),
                    status=status,
                    mimetype="application/json"
                )

    @app.after_request
    def add_security_and_cache_headers(response):
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['X-Content-Type-Options'] = 'nosniff'

        path = flask.request.path or ''

        # ── Respuestas de error: nunca se cachean ──
        # Un 401/403/5xx con max-age queda guardado en el navegador y se sigue
        # sirviendo aunque el permiso ya se haya corregido en el backend.
        if response.status_code >= 400:
            response.headers['Cache-Control'] = 'no-store'
            response.headers.pop('ETag', None)
            return response

        # ── Imágenes WebP: caché agresivo 30 días (inmutables por hash de nombre) ──
        if path.startswith('/api/v1/public/images/') or response.content_type == 'image/webp':
            response.headers['Cache-Control'] = 'public, max-age=2592000, immutable'
            response.headers['Vary'] = 'Accept-Encoding'

        # ── Catálogos maestros: caché 24h (breeds, species, vaccines, medications) ──
        elif any(path.startswith(p) for p in [
            '/api/v1/breeds', '/api/v1/species', '/api/v1/vaccines',
            '/api/v1/medications', '/api/v1/food', '/api/v1/diseases',
            '/api/v1/route-administrations', '/api/v1/knowledge_base',
        ]):
            # `private`: la respuesta depende del token (y de la finca del usuario),
            # no debe quedar en cachés compartidas aunque se declare Vary.
            response.headers['Cache-Control'] = 'private, max-age=86400, stale-while-revalidate=3600'
            response.headers['Vary'] = 'Accept-Encoding, Authorization'

        # ── Endpoints de usuario: no cachear en proxies públicos ──
        elif path.startswith('/api/v1/users') or path.startswith('/api/v1/auth'):
            response.headers['Cache-Control'] = 'private, no-store'

        # ── Resto de la API: 1 min de stale-while-revalidate para reducir latencia ──
        elif path.startswith('/api/v1/') and flask.request.method == 'GET':
            if not response.headers.get('Cache-Control'):
                response.headers['Cache-Control'] = 'private, max-age=60, stale-while-revalidate=30'

        return response
