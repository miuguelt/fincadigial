import json
import logging
import flask

def register_request_hooks(app):
    
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
        """Inyecta access_token en el cuerpo JSON si está presente."""
        # Evitar procesar streams (SSE, archivos, etc.) para no bloquear el worker
        if response.direct_passthrough or response.is_streamed:
            return response
        if response.mimetype == 'text/event-stream':
            return response

        try:
            data_bytes = response.get_data(as_text=False) or b''

            token = None
            try:
                auth = flask.request.headers.get('Authorization', '')
                if isinstance(auth, str) and auth.lower().startswith('bearer '):
                    token = auth.split(' ', 1)[1].strip()
                if not token:
                    cookie_name = flask.current_app.config.get('JWT_ACCESS_COOKIE_NAME', 'access_token_cookie')
                    token = flask.request.cookies.get(cookie_name)
            except Exception:
                token = None

            if not token:
                return response

            try:
                data_text = response.get_data(as_text=True) or ''
                payload = json.loads(data_text) if data_text else None
            except Exception:
                return response

            if isinstance(payload, dict):
                if 'success' in payload and ('data' in payload or 'error' in payload):
                    return response
                payload['access_token'] = token
                response.set_data(json.dumps(payload))
                response.headers['Content-Type'] = 'application/json; charset=utf-8'
        except Exception:
            pass
        return response
