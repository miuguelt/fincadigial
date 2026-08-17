import logging
import re

import flask
from flask_restx import Resource
from sqlalchemy.exc import IntegrityError

from app import db
from app.models.base_model import ValidationError
from app.models.user import User
from app.utils.response_handler import APIResponse
from .users_namespace import users_ns

logger = logging.getLogger(__name__)


@users_ns.route("/public", endpoint="users_public_create")
class UserPublicCreate(Resource):
    @users_ns.doc(
        "public_create_user",
        description="Crear un usuario sin autenticacion (habilitado por defecto; se puede desactivar con PUBLIC_USER_CREATION_ENABLED=false). Si no existe ninguna finca, se crea una automáticamente.",
    )
    def post(self):
        try:
            data = flask.request.get_json() or {}
            required_fields = [
                "identification",
                "fullname",
                "password",
                "email",
                "phone",
                "role",
            ]
            missing = [field for field in required_fields if field not in data]
            if missing:
                return APIResponse.validation_error({field: "Requerido" for field in missing})

            data["finca_id"] = None
            password_raw = data.pop("password")
            password_confirmation = data.pop("password_confirmation", None)
            if password_confirmation is not None and password_confirmation != password_raw:
                return APIResponse.validation_error({"password_confirmation": "No coincide"})

            existing_users = User.query.count()
            from app.models.user import ApprovalStatus

            if existing_users == 0:
                data["approval_status"] = ApprovalStatus.Approved
                data["status"] = True
            data["password"] = password_raw
            user = User.create(commit=True, **data)
            logger.info("Usuario público creado: %s (Sin finca asociada)", user.email)
            self._notify_global_administrators(user)
            return APIResponse.created(
                user.to_namespace_dict(), message="Usuario creado exitosamente"
            )
        except ValidationError as error:
            db.session.rollback()
            errors = error.errors if getattr(error, "errors", None) else {}
            if not errors and getattr(error, "field", None):
                errors = {error.field: error.message}
            return APIResponse.validation_error(errors or {"general": str(error)})
        except IntegrityError as error:
            db.session.rollback()
            return self._integrity_conflict(error)
        except Exception as error:
            db.session.rollback()
            logger.error("Error en creación pública de usuario: %s", error, exc_info=True)
            return APIResponse.error(
                "Error interno del servidor", details={"error": str(error)}, status_code=500
            )

    @staticmethod
    def _notify_global_administrators(user):
        try:
            from app.models.user import Role
            from app.services.event_service import EventService
            from app.services.push_notification_service import PushNotificationService

            role_display = getattr(user.role, "value", str(user.role))
            user_name = user.fullname or "Un usuario"
            admin_ids = {
                admin.id for admin in User.query.filter(User.role == Role.Administrador).all()
            }
            logger.info("Enviando alertas de registro a %d destinatarios (Admin global)", len(admin_ids))
            for target_user_id in admin_ids:
                PushNotificationService.send_to_user(
                    user_id=target_user_id,
                    title="Nuevo Usuario Registrado",
                    body=f"{user_name} se ha registrado como {role_display}.",
                    tag="new-user",
                    data={"type": "new_user", "user_id": user.id, "url": "/admin/users"},
                )
                EventService.emit_to_user(
                    user_id=target_user_id,
                    event_type="new_user",
                    data={
                        "title": "Nuevo Usuario Registrado",
                        "message": f"{user_name} se ha registrado como {role_display}.",
                        "type": "info",
                        "action": {"label": "Ver Usuarios", "url": "/admin/users"},
                    },
                )
        except Exception as error:
            logger.warning("No se pudo enviar notificación de nuevo usuario: %s", error)

    @staticmethod
    def _integrity_conflict(error):
        message = str(getattr(error, "orig", error))
        value = None
        key_name = None
        columns = []
        duplicate = re.search(
            r"Duplicate entry '(.+?)' for key '(.+?)'", message, flags=re.IGNORECASE
        )
        if duplicate:
            value, key_name = duplicate.groups()
        else:
            sqlite_error = re.search(r"UNIQUE constraint failed: (.+)", message, flags=re.IGNORECASE)
            postgres_error = re.search(
                r'duplicate key value violates unique constraint "(.+?)"',
                message,
                flags=re.IGNORECASE,
            )
            if sqlite_error:
                key_name = sqlite_error.group(1)
            elif postgres_error:
                key_name = postgres_error.group(1)
                key_value = re.search(r"Key \((.+?)\)=\((.+?)\) already exists", message)
                if key_value:
                    columns = [key_value.group(1)]
                    value = key_value.group(2)

        if not columns and key_name:
            columns = [column.name for column in User.__table__.columns if column.name in key_name]
        if not columns:
            columns = [
                field
                for field in getattr(User, "_unique_fields", []) or []
                if field in (key_name or "") or field in message
            ]

        labels = {"email": "correo", "identification": "número de identificación", "phone": "teléfono"}
        if len(columns) == 1:
            field = columns[0]
            label = labels.get(field, field)
            return APIResponse.conflict(
                f"Ya existe un usuario con ese {label}. Cambia el {label}.",
                details={
                    "conflict": {
                        "field": field,
                        "label": label,
                        "value": value,
                        "key": key_name,
                        "suggestion": f"Cambia el {label} por otro que no esté registrado.",
                    }
                },
            )
        if len(columns) > 1:
            return APIResponse.conflict(
                "Ya existe un usuario con esa combinación de datos. Modifica uno de esos campos.",
                details={
                    "conflict": {
                        "fields": columns,
                        "value": value,
                        "key": key_name,
                        "suggestion": "Modifica al menos uno de los campos para que la combinación sea única.",
                    }
                },
            )
        return APIResponse.conflict("Violación de unicidad", details={"error": message})
