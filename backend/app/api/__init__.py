import os
import re
import urllib.parse
import logging
import pathlib
import flask
from flask_restx import Api
from collections import OrderedDict

from .sse import init_sse_bus, sse_events_handler
from .docs import register_docs_routes
from .namespaces_registry import register_namespaces
from .limiter import apply_rate_limit_exemptions
from ..utils.response_handler import APIResponse
from ..utils.private_file_urls import verify_file_url_signature


def register_api(app, limiter=None):
    logger = logging.getLogger(__name__)
    api_bp = flask.Blueprint("api", __name__, url_prefix="/api/v1")

    # Configuración de autorizaciones
    access_cookie_name = app.config.get("JWT_ACCESS_COOKIE_NAME", "access_token_cookie")
    authorizations = OrderedDict()
    authorizations["Bearer"] = {
        "type": "apiKey",
        "in": "header",
        "name": "Authorization",
        "description": "JWT token. Formato: Bearer <token>",
    }
    authorizations["Cookie"] = {
        "type": "apiKey",
        "in": "cookie",
        "name": access_cookie_name,
        "description": "JWT token en cookie",
    }

    api = Api(
        api_bp,
        default_mediatype="application/json",
        version="1.0",
        title="Finca Villa Luz API",
        description="API RESTful para la gestión integral de ganado.",
        doc="/docs/",
        authorizations=authorizations,
        security=["Bearer", "Cookie"],
        ordered=True,
        catch_all_404s=True,
    )

    # UI de documentación personalizada
    @api.documentation
    def custom_swagger_ui():
        return flask.render_template(
            "swagger_ui_custom.html",
            title=api.title,
            specs_url="/api/v1/swagger.json",
            cookie_config={
                "access": access_cookie_name,
                "refresh": app.config.get(
                    "JWT_REFRESH_COOKIE_NAME", "refresh_token_cookie"
                ),
                "csrf_access": app.config.get(
                    "JWT_ACCESS_CSRF_COOKIE_NAME", "csrf_access_token"
                ),
                "csrf_refresh": app.config.get(
                    "JWT_REFRESH_CSRF_COOKIE_NAME", "csrf_refresh_token"
                ),
            },
        )

    # Registrar namespaces
    ns_info = register_namespaces(api)

    # Aplicar rate limits
    if app.config.get("RATE_LIMIT_ENABLED", True) and limiter:
        try:
            from ..namespaces.users.auth_namespace import (
                set_limiter as set_auth_limiter,
            )
            from ..namespaces.users.users_namespace import (
                set_limiter as set_users_limiter,
            )
            from ..namespaces.core.activity_namespace import (
                set_limiter as set_activity_limiter,
            )

            set_auth_limiter(limiter)
            set_users_limiter(limiter)
            set_activity_limiter(limiter)

            apply_rate_limit_exemptions(
                app, api, api_bp, limiter, ns_info["exempt_list"]
            )
        except Exception:
            logger.exception("Error aplicando rate limiting")

    # Inicializar SSE
    init_sse_bus(app)
    api_bp.route("/sse/events", methods=["GET", "HEAD"])(sse_events_handler)

    # Registrar rutas de documentación dinámicas
    register_docs_routes(api_bp)

    # Endpoint para servir archivos del chat
    @api_bp.route("/public/images/<path:filename>", methods=["GET"])
    def serve_chat_file(filename):
        try:
            if not verify_file_url_signature(filename, flask.request.args.get("sig")):
                return flask.jsonify({"error": "URL de archivo inválida o vencida"}), 403

            uploads_folder = app.config.get("UPLOAD_FOLDER", "static/uploads")
            uploads_path = pathlib.Path(uploads_folder)
            if uploads_path.is_absolute():
                allowed_base = uploads_path.resolve()
            else:
                allowed_base = (
                    pathlib.Path(app.root_path).parent / uploads_folder
                ).resolve()

            # Normalizar decodificación para prevenir secuencias codificadas complejas
            decoded_name = filename
            for _ in range(2):
                unquoted = urllib.parse.unquote(decoded_name)
                if unquoted == decoded_name:
                    break
                decoded_name = unquoted

            if "\x00" in decoded_name:
                resp = flask.make_response(b"", 403)
                resp.mimetype = "image/jpeg"
                return resp

            clean_rel = os.path.normpath(decoded_name.replace("\\", "/")).lstrip("/\\")
            file_path = (allowed_base / clean_rel).resolve()
            if not file_path.is_relative_to(allowed_base):
                resp = flask.make_response(b"", 403)
                resp.mimetype = "image/jpeg"
                return resp

            if (not file_path.exists()) and filename.startswith("animals/"):
                requested_name = pathlib.Path(clean_rel).name
                # Evitar inyección de patrones glob y nombres ocultos
                if re.match(r"^[a-zA-Z0-9_\-\.]+$", requested_name) and not requested_name.startswith("."):
                    animals_base = (allowed_base / "animals").resolve()
                    if animals_base.is_dir():
                        matches = [
                            candidate.resolve()
                            for candidate in animals_base.glob(f"*/{requested_name}")
                            if candidate.is_file() and candidate.resolve().is_relative_to(animals_base)
                        ]
                        if matches:
                            file_path = matches[0]

            if not file_path.is_file() or not file_path.is_relative_to(allowed_base):
                resp = flask.make_response(b"", 404)
                resp.mimetype = "image/jpeg"
                return resp

            rel_to_base = file_path.relative_to(allowed_base).as_posix()
            return flask.send_from_directory(str(allowed_base), rel_to_base)
        except Exception as e:
            logger.error("Error sirviendo archivo público %s: %s", filename, e, exc_info=True)
            resp = flask.make_response(b"", 500)
            resp.mimetype = "image/jpeg"
            return resp

    # Ruta puente para requests directos a /static/uploads/ reenviados por Nginx
    @app.route("/static/uploads/<path:filename>", methods=["GET"])
    def serve_static_uploads_alias(filename):
        return serve_chat_file(filename)
    @api_bp.route("/", methods=["GET", "OPTIONS"])
    def api_root_confirm():
        return APIResponse.success(message="Bienvenido a la API Villa Luz")

    app.register_blueprint(api_bp)
    app.extensions["restx_api"] = api
    return api
