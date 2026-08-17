import logging

import flask
from flask_jwt_extended import get_jwt, jwt_required
from flask_restx import Resource, fields

from app import db
from app.models.finca import Finca
from app.models.user import User
from app.models.user_finca import UserFinca
from app.services.users_service import (
    _format_activity_item,
    build_user_activity_query,
    get_user_statistics,
)
from app.utils.namespace_helpers import create_optimized_namespace
from app.utils.response_handler import APIResponse

logger = logging.getLogger(__name__)
limiter = None

users_ns = create_optimized_namespace(
    name="users",
    description="👥 Gestión Optimizada de Usuarios del Sistema",
    model_class=User,
    path="/users",
    public_create=True,
)


def set_limiter(app_limiter):
    """Apply the configured rate limit to the generated user creation route."""
    global limiter
    limiter = app_limiter
    try:
        if not limiter:
            return
        from app.utils.rate_limiter import RATE_LIMIT_CONFIG, get_remote_address_with_forwarded

        create_limit = (RATE_LIMIT_CONFIG.get("users", {}) or {}).get("create", "10 per hour")
        list_resource = getattr(users_ns, "_model_list_resource", None)
        if (
            list_resource
            and hasattr(list_resource, "post")
            and not getattr(list_resource.post, "_rate_limit_applied", False)
        ):
            list_resource.post = limiter.limit(
                create_limit,
                key_func=get_remote_address_with_forwarded,
                methods=["POST"],
            )(list_resource.post)
            list_resource.post._rate_limit_applied = True
            logger.info("Rate limit aplicado a creación de usuarios: %s", create_limit)
    except Exception:
        logger.exception("No se pudo aplicar rate limit a creación de usuarios")


@users_ns.route("/search")
class UserSearchResource(Resource):
    @users_ns.doc(
        "search_users",
        description="Buscar usuarios por nombre o correo",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        try:
            query = flask.request.args.get("q", "")
            limit = flask.request.args.get("limit", default=10, type=int)
            if len(query) < 3:
                return APIResponse.success(data=[], message="Query too short")

            users = (
                User.query.filter(
                    (User.fullname.ilike(f"%{query}%")) | (User.email.ilike(f"%{query}%"))
                )
                .limit(limit)
                .all()
            )
            result = []
            for user in users:
                email = user.email
                if email and "@" in email:
                    prefix, domain = email.split("@")
                    masked_email = f"{prefix[:3]}***@{domain}"
                else:
                    masked_email = email
                result.append(
                    {
                        "id": user.id,
                        "full_name": user.fullname,
                        "avatar_url": user.avatar_url,
                        "email_masked": masked_email,
                        "tiene_finca": user.finca_id is not None,
                    }
                )
            return APIResponse.success(data=result, message="Usuarios encontrados")
        except Exception as error:
            logger.error("Error en búsqueda de usuarios: %s", error)
            return APIResponse.error("Error interno", details={"error": str(error)})


@users_ns.route("/<int:user_id>/avatar")
class UserAvatarResource(Resource):
    @users_ns.doc(
        "update_user_avatar",
        description="Actualizar foto de perfil del usuario",
        security=["Bearer"],
    )
    @jwt_required()
    def patch(self, user_id):
        try:
            current_user_id = int(get_jwt().get("id"))
            if current_user_id != user_id and get_jwt().get("role") != "Administrador":
                return APIResponse.forbidden("No puede cambiar el avatar de otro usuario")
            if "file" not in flask.request.files:
                return APIResponse.validation_error({"file": "No se proporcionó archivo"})
            file = flask.request.files["file"]
            if not file or file.filename == "":
                return APIResponse.validation_error({"file": "Archivo vacío"})
            if not file.content_type.startswith("image/"):
                return APIResponse.validation_error({"file": "El archivo debe ser una imagen"})

            from app.utils.file_storage import save_user_avatar

            avatar_url = save_user_avatar(user_id, file)
            user = User.query.get(user_id)
            user.avatar_url = avatar_url
            db.session.commit()
            return APIResponse.success(data={"avatar_url": avatar_url}, message="Avatar actualizado")
        except Exception as error:
            db.session.rollback()
            logger.error("Error actualizando avatar: %s", error)
            return APIResponse.error("Error interno", details={"error": str(error)})

    @users_ns.doc(
        "delete_user_avatar",
        description="Eliminar foto de perfil del usuario",
        security=["Bearer"],
    )
    @jwt_required()
    def delete(self, user_id):
        try:
            current_user_id = int(get_jwt().get("id"))
            if current_user_id != user_id and get_jwt().get("role") != "Administrador":
                return APIResponse.forbidden("No puede eliminar el avatar de otro usuario")
            user = User.query.get(user_id)
            if user.avatar_url:
                user.avatar_url = None
                db.session.commit()
            return APIResponse.success(message="Avatar eliminado")
        except Exception as error:
            db.session.rollback()
            return APIResponse.error("Error interno", details={"error": str(error)})


user_role_stats_model = users_ns.model(
    "UserRoleStats", {"count": fields.Integer, "percentage": fields.Float}
)
user_status_stats_model = users_ns.model(
    "UserStatusStats",
    {
        "active_users": fields.Integer,
        "inactive_users": fields.Integer,
        "total_users": fields.Integer,
        "active_percentage": fields.Float,
    },
)
user_roles_distribution_model = users_ns.model(
    "UserRolesDistribution",
    {"roles": fields.Raw, "total_users": fields.Integer},
)
user_statistics_model = users_ns.model(
    "UserStatistics",
    {"total_users": fields.Integer, "role_distribution": fields.Raw, "status_distribution": fields.Raw},
)


@users_ns.route("/statistics")
class UserStatistics(Resource):
    @users_ns.doc(
        "get_user_statistics",
        description="Estadísticas completas de usuarios",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        try:
            return APIResponse.success(
                data=get_user_statistics(), message="Estadísticas completas de usuarios"
            )
        except Exception as error:
            logger.error("Error obteniendo estadísticas de usuarios: %s", error, exc_info=True)
            return APIResponse.error(
                "Error interno del servidor", details={"error": str(error)}, status_code=500
            )


@users_ns.route("/<int:user_id>/activity")
class UserActivity(Resource):
    @users_ns.doc(
        "get_user_activity",
        description="Get paginated activity feed for a specific actor",
        security=["Bearer"],
        params={
            "page": "Page number",
            "limit": "Items per page",
            "per_page": "Items per page (alias)",
            "entity": "Filter by entity",
            "action": "Filter by action",
            "severity": "Filter by severity",
            "entity_id": "Filter by entity id",
            "animal_id": "Filter by animal id",
            "from": "ISO datetime lower bound",
            "to": "ISO datetime upper bound",
        },
    )
    @jwt_required()
    def get(self, user_id):
        page = flask.request.args.get("page", default=1, type=int) or 1
        limit = flask.request.args.get("limit", type=int) or flask.request.args.get("per_page", type=int) or 50
        query = build_user_activity_query(user_id, flask.request.args)
        pagination = query.paginate(page=page, per_page=int(limit), error_out=False)
        items = [_format_activity_item(item) for item in pagination.items]
        return APIResponse.paginated_success(
            data=items,
            page=page,
            limit=int(limit),
            total_items=pagination.total,
            message="Actividad obtenida",
        )


@users_ns.route("/<int:user_id>/fincas")
class UserFincas(Resource):
    @users_ns.doc(
        "get_user_fincas",
        description="Obtener fincas asociadas a un usuario",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self, user_id):
        try:
            fincas_raw = UserFinca.get_user_fincas(user_id, active_only=False)
            fincas_enriched = []
            for finca_data in fincas_raw:
                finca = Finca.query.get(finca_data["finca_id"])
                if finca:
                    finca_data["finca_name"] = finca.name
                    finca_data["finca_type"] = finca.type.value if finca.type else None
                    finca_data["finca_logo"] = finca.logo_url
                    fincas_enriched.append(finca_data)
            return APIResponse.success(
                data={"fincas": fincas_enriched, "count": len(fincas_enriched)},
                message="Fincas del usuario obtenidas",
            )
        except Exception as error:
            logger.error("Error obteniendo fincas del usuario %s: %s", user_id, error, exc_info=True)
            return APIResponse.error(
                "Error interno del servidor", details={"error": str(error)}, status_code=500
            )


# Import route modules after the namespace exists; imports register their resources.
from . import user_global_namespace as _user_global_namespace  # noqa: F401, E402
from . import user_public_namespace as _user_public_namespace  # noqa: F401, E402
