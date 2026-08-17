import flask
import logging

from flask_jwt_extended import get_jwt, jwt_required
from flask_restx import Resource

from app import db
from app.models.user import User
from app.services.users_service import (
    get_global_users,
    get_user_roles_stats,
    get_user_status_stats,
)
from app.utils.response_handler import APIResponse
from .users_namespace import users_ns

logger = logging.getLogger(__name__)


@users_ns.route("/global")
class GlobalUsersResource(Resource):
    @users_ns.doc(
        "get_global_users",
        description="[ADMIN] Obtener todos los usuarios del sistema con sus fincas",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        """Return the global directory with memberships loaded in one batch."""
        try:
            jwt_data = get_jwt()
            from app.utils.tenant_context import is_system_admin_identity

            if not is_system_admin_identity(
                jwt_data.get("role"), jwt_data.get("identification")
            ):
                return APIResponse.error(
                    "No tiene permisos para acceder a la vista global", status_code=403
                )

            result = get_global_users()
            if not result:
                return APIResponse.success(
                    data=[], message="No hay usuarios registrados"
                )
            return APIResponse.success(
                data=result, message=f"Se obtuvieron {len(result)} usuarios globalmente"
            )
        except Exception as error:
            logger.error("Error en vista global de usuarios: %s", error, exc_info=True)
            return APIResponse.error(
                "Error al obtener vista global",
                details={"error": str(error)},
                status_code=500,
            )


@users_ns.route("/<int:user_id>/approval-status")
class UserApprovalStatus(Resource):
    @users_ns.doc(
        "update_approval_status",
        description="Cambiar el estado de aprobación de un usuario (Administrador/Instructor/Propietario)",
        security=["Bearer"],
    )
    @jwt_required()
    def patch(self, user_id):
        try:
            jwt_data = get_jwt()
            current_role = jwt_data.get("role")
            current_user_id = int(jwt_data.get("id", 0))
            if current_role not in ("Administrador", "Instructor", "Propietario"):
                return APIResponse.forbidden(
                    "Se requiere rol de Administrador, Instructor o Propietario para esta operación"
                )

            data = flask.request.get_json() or {}
            new_status = data.get("approval_status")
            if new_status not in ("Approved", "Rejected", "Suspended"):
                return APIResponse.validation_error(
                    {"approval_status": "Debe ser Approved, Rejected o Suspended"}
                )

            target_user = User.query.get(user_id)
            if not target_user:
                return APIResponse.not_found("Usuario no encontrado")

            from app.models.user import ApprovalStatus

            old_status = target_user.approval_status.value if target_user.approval_status else "None"
            target_user.approval_status = ApprovalStatus(new_status)
            target_user.status = new_status == "Approved"
            db.session.commit()
            logger.info(
                "Usuario %s (ID:%d) cambió approval_status de %s a %s",
                jwt_data.get("fullname"),
                current_user_id,
                old_status,
                new_status,
            )
            return APIResponse.success(
                data=target_user.to_namespace_dict(),
                message=f"Usuario {'aprobado' if new_status == 'Approved' else 'rechazado'} exitosamente",
            )
        except Exception as error:
            db.session.rollback()
            logger.error("Error al actualizar approval_status: %s", error, exc_info=True)
            return APIResponse.error(
                "Error interno del servidor", details={"error": str(error)}, status_code=500
            )


@users_ns.route("/status")
class UserStatusStats(Resource):
    @users_ns.doc(
        "get_user_status_stats",
        description="Resumen de usuarios por estado",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        try:
            return APIResponse.success(
                data=get_user_status_stats(), message="Estadísticas de estado de usuarios"
            )
        except Exception as error:
            logger.error("Error obteniendo estadísticas de estado: %s", error, exc_info=True)
            return APIResponse.error(
                "Error interno del servidor", details={"error": str(error)}, status_code=500
            )


@users_ns.route("/roles")
class UserRolesStats(Resource):
    @users_ns.doc(
        "get_user_roles_stats",
        description="Distribución de usuarios por roles",
        security=["Bearer"],
    )
    @jwt_required()
    def get(self):
        try:
            return APIResponse.success(
                data=get_user_roles_stats(), message="Distribución por roles"
            )
        except Exception as error:
            logger.error("Error obteniendo estadísticas de roles: %s", error, exc_info=True)
            return APIResponse.error(
                "Error interno del servidor", details={"error": str(error)}, status_code=500
            )
