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
            specs_url=api.specs_url,
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
            uploads_folder = app.config.get("UPLOAD_FOLDER", "static/uploads")
            file_path = (
                pathlib.Path(app.root_path).parent / uploads_folder / filename
            ).resolve()
            allowed_base = (
                pathlib.Path(app.root_path).parent / uploads_folder
            ).resolve()

            if (
                not file_path.exists()
                or not str(file_path).startswith(str(allowed_base))
            ) and filename.startswith("animals/"):
                requested_name = pathlib.Path(filename).name
                animals_base = (allowed_base / "animals").resolve()
                matches = [
                    candidate.resolve()
                    for candidate in animals_base.glob(f"*/{requested_name}")
                    if candidate.is_file()
                ]
                valid_matches = [
                    candidate
                    for candidate in matches
                    if str(candidate).startswith(str(animals_base))
                ]
                if valid_matches:
                    file_path = valid_matches[0]

            if not file_path.exists() or not str(file_path).startswith(
                str(allowed_base)
            ):
                return flask.jsonify({"error": "No encontrado"}), 404
            return flask.send_file(str(file_path))
        except Exception:
            return flask.jsonify({"error": "Error interno"}), 500

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
