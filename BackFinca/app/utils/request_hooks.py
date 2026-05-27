import json
import flask

def register_request_hooks(app):

    @app.before_request
    def short_circuit_when_database_is_down():
        """Evita que cada request intente abrir conexiones cuando la BD ya fallo."""
        from app.utils.db_availability import (
            database_retry_after_seconds,
            database_unavailable_details,
            is_database_temporarily_unavailable,
        )
        from app.utils.response_handler import APIResponse

        if not is_database_temporarily_unavailable():
            return None

        path = flask.request.path or ""
        if path.startswith(("/api/v1/docs", "/swaggerui", "/docs", "/static")):
            return None

        retry_after = database_retry_after_seconds()
        body, status = APIResponse.error(
            message="Base de datos temporalmente no disponible",
            status_code=503,
            error_code="DATABASE_UNAVAILABLE",
            details=database_unavailable_details(),
        )
        return body, status, {"Retry-After": str(retry_after)}

    @app.after_request
    def force_json_response(response):
        if response.direct_passthrough or response.is_streamed or response.mimetype == 'text/event-stream':
            return response
        try:
            if response.mimetype in ('application/json', 'text/csv', 'application/octet-stream'):
                return response
            data_prefix = (response.get_data(as_text=False) or b'')[:1]
            if data_prefix in (b'{', b'['):
                response.headers['Content-Type'] = 'application/json; charset=utf-8'
        except Exception:
            pass
        return response

    @app.after_request
    def attach_access_token_to_json(response):
        """Inyecta access_token solo en respuestas de endpoints auth."""
        if response.direct_passthrough or response.is_streamed:
            return response
        if response.mimetype == 'text/event-stream':
            return response
        if not flask.request.path.startswith('/auth/'):
            return response

        try:
            auth = flask.request.headers.get('Authorization', '')
            if isinstance(auth, str) and auth.lower().startswith('bearer '):
                token = auth.split(' ', 1)[1].strip()
            else:
                cookie_name = flask.current_app.config.get('JWT_ACCESS_COOKIE_NAME', 'access_token_cookie')
                token = flask.request.cookies.get(cookie_name)

            if not token:
                return response

            data_text = response.get_data(as_text=True) or ''
            payload = json.loads(data_text) if data_text else None

            if isinstance(payload, dict):
                payload['access_token'] = token
                response.set_data(json.dumps(payload))
                response.headers['Content-Type'] = 'application/json; charset=utf-8'
        except Exception:
            pass
        return response
