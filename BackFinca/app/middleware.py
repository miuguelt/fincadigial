import flask
import time
import logging
import json

logger = logging.getLogger(__name__)

def register_middleware(app):
    @app.before_request
    def handle_dash_aliases():
        path = flask.request.path or ""
        if path.startswith("/api/v1/food-types"):
            new_path = path.replace("/api/v1/food-types", "/api/v1/food_types", 1)
            if flask.request.query_string:
                new_path += "?" + flask.request.query_string.decode("utf-8")
            return flask.redirect(new_path, code=308)

    @app.before_request
    def _start_request_timer():
        flask.g._req_start_time = time.perf_counter()



    @app.after_request
    def _attach_request_timing(response):
        try:
            start = getattr(flask.g, "_req_start_time", None)
            if start is not None:
                elapsed_ms = (time.perf_counter() - start) * 1000.0
                response.headers["X-Response-Time-ms"] = f"{elapsed_ms:.1f}"
                slow_ms = float(app.config.get("SLOW_REQUEST_MS", 1000))
                if elapsed_ms >= slow_ms:
                    app.logger.warning("Slow flask.request %.1fms %s %s", elapsed_ms, flask.request.method, flask.request.path)
        except Exception:
            pass
        return response

    @app.after_request
    def force_json_response(response):
        try:
            if response.direct_passthrough or response.mimetype in ('application/json', 'text/csv', 'application/octet-stream', 'text/event-stream'):
                return response
            data_prefix = (response.get_data(as_text=False) or b'')[:1]
            if data_prefix in (b'{', b'['):
                response.headers['Content-Type'] = 'application/json; charset=utf-8'
        except Exception:
            pass
        return response

    @app.after_request
    def attach_access_token_to_json(response):
        try:
            path = flask.request.path or ""
            if not path.startswith("/api/v1/auth/") or response.status_code >= 400:
                return response

            data_bytes = response.get_data(as_text=False) or b''
            is_json_like = (response.mimetype and response.mimetype.startswith('application/json')) or (data_bytes[:1] in (b'{', b'['))
            if not is_json_like:
                return response

            token = None
            auth = flask.request.headers.get('Authorization', '')
            if isinstance(auth, str) and auth.lower().startswith('bearer '):
                token = auth.split(' ', 1)[1].strip()
            if not token:
                cookie_name = flask.current_app.config.get('JWT_ACCESS_COOKIE_NAME', 'access_token_cookie')
                token = flask.request.cookies.get(cookie_name)

            if not token:
                return response

            data_text = response.get_data(as_text=True) or ''
            payload = json.loads(data_text) if data_text else None
            if isinstance(payload, dict) and "access_token" not in payload:
                payload["access_token"] = token
                response.set_data(json.dumps(payload))
        except Exception:
            pass
        return response

    @app.after_request
    def set_security_headers(response):
        """
        Implementación de Headers de Seguridad Recomendados (OWASP).
        """
        # 1. Prevenir que el navegador adivine el tipo de contenido (MIME Sniffing)
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # 2. Prevenir Clickjacking (solo permitir iframes del mismo origen)
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'

        # 3. Habilitar filtro XSS del navegador (Legacy pero útil)
        response.headers['X-XSS-Protection'] = '1; mode=block'

        # 4. HSTS (Strict Transport Security) - Solo en producción
        if not flask.current_app.config.get('DEBUG', False):
            response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

        # 5. Content Security Policy (CSP) - Ampliado para docs en desarrollo
        path = (flask.request.path or '').rstrip('/')
        is_docs = path.startswith('/api/v1/docs') or path.startswith('/swaggerui') or path.startswith('/docs')
        is_debug = flask.current_app.config.get('DEBUG', False)
        # DEBUG: Verificar valores
        response.headers['X-DEBUG-is_docs'] = str(is_docs)
        response.headers['X-DEBUG-is_debug'] = str(is_debug)
        response.headers['X-DEBUG-path'] = path
        if is_docs and is_debug:
            # CSP relajado para Swagger UI en desarrollo
            csp_policy = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "img-src 'self' data: blob: https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; "
                "connect-src *;"
            )
            response.headers['Content-Security-Policy'] = csp_policy
        elif not is_docs:
            # CSP normal para endpoints API
            if flask.current_app.config.get('DEBUG', False) or flask.current_app.config.get('TESTING', False):
                csp_policy = (
                    "default-src 'self'; "
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; "
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
                    "font-src 'self' https://fonts.gstatic.com; "
                    "img-src 'self' data: blob:; "
                    "connect-src 'self' ws: wss:;"
                )
            else:
                csp_policy = (
                    "default-src 'self'; "
                    "script-src 'self' https://cdn.jsdelivr.net; "
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
                    "font-src 'self' https://fonts.gstatic.com; "
                    "img-src 'self' data: blob:; "
                    "connect-src 'self' ws: wss:;"
                )
            response.headers['Content-Security-Policy'] = csp_policy

        # 6. Referrer Policy
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

        return response
