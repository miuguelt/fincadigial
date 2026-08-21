import flask
from datetime import UTC, datetime
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.chat_message import ChatMessage
from app.models.user import User
from app.models.user_finca import UserFinca
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from app.utils.file_storage import save_chat_file
from app.services.event_service import EventService
from app import db, cache
import logging

logger = logging.getLogger(__name__)

chat_ns = Namespace("chat", description="Operaciones de chat interno")

message_model = chat_ns.model(
    "ChatMessage",
    {
        "recipient_id": fields.Integer(
            required=True, description="ID del destinatario"
        ),
        "message": fields.String(required=True, description="Contenido del mensaje"),
        "client_message_id": fields.String(
            required=False, description="ID idempotente generado por el cliente"
        ),
        "attachment_url": fields.String(
            required=False, description="URL del archivo adjunto"
        ),
        "attachment_type": fields.String(
            required=False, description="Tipo de archivo (image/file)"
        ),
        "attachment_name": fields.String(
            required=False, description="Nombre del archivo"
        ),
    },
)


def _identity_as_int() -> int:
    try:
        return int(get_jwt_identity())
    except (TypeError, ValueError):
        return 0


def _active_membership_exists(finca_id: int):
    """Expresión SQL para membresía activa, conservando usuarios heredados.

    `User.finca_id` sigue aceptándose porque hay instalaciones anteriores a la
    tabla N:M. Las altas nuevas y multi-finca se resuelven desde `user_finca`.
    """
    membership = (
        db.session.query(UserFinca.id)
        .filter(
            UserFinca.user_id == User.id,
            UserFinca.finca_id == finca_id,
            UserFinca.is_active.is_(True),
        )
        .exists()
    )
    return db.or_(User.finca_id == finca_id, membership)


def _chat_recipient(recipient_id: int, finca_id: int):
    return User.query.filter(
        User.id == recipient_id,
        User.status.is_(True),
        _active_membership_exists(finca_id),
    ).first()


@chat_ns.route("/contacts")
class ChatContactsResource(Resource):
    @jwt_required()
    def get(self):
        """Listar usuarios en la misma finca para chatear."""
        user_id = _identity_as_int()
        finca_id = get_current_finca_id()

        if not finca_id:
            return APIResponse.error(
                "No se ha detectado el contexto de la finca", status_code=400
            )

        # La membresía N:M es la fuente de verdad para personal multi-finca.
        # `distinct` evita duplicados en instalaciones con fila heredada y N:M.
        contacts = (
            User.query.filter(
                User.id != user_id,
                User.status.is_(True),
                _active_membership_exists(finca_id),
            )
            .order_by(User.fullname.asc())
            .all()
        )

        unread_rows = (
            db.session.query(
                ChatMessage.sender_id,
                db.func.count(ChatMessage.id),
            )
            .filter(
                ChatMessage.recipient_id == user_id,
                ChatMessage.finca_id == finca_id,
                ChatMessage.is_read.is_(False),
            )
            .group_by(ChatMessage.sender_id)
            .all()
        )
        unread_by_sender = {
            int(sender_id): int(count) for sender_id, count in unread_rows
        }

        membership_rows = UserFinca.query.filter(
            UserFinca.user_id.in_([contact.id for contact in contacts]),
            UserFinca.finca_id == finca_id,
            UserFinca.is_active.is_(True),
        ).all()
        finca_roles = {
            membership.user_id: membership.role for membership in membership_rows
        }

        # Transformar datos
        contacts_data = [
            {
                "id": c.id,
                "fullname": c.fullname,
                "role": finca_roles.get(c.id)
                or (c.role.value if hasattr(c.role, "value") else c.role),
                "email": c.email,
                "unread_count": unread_by_sender.get(c.id, 0),
            }
            for c in contacts
        ]

        return APIResponse.success(data=contacts_data)


@chat_ns.route("/history/<int:recipient_id>")
class ChatHistoryResource(Resource):
    @jwt_required()
    def get(self, recipient_id):
        """Obtener historial de mensajes con un usuario."""
        user_id = _identity_as_int()
        finca_id = get_current_finca_id()

        # Parámetros de paginación optimizada (cursor before_id o paginación clásica)
        before_id = flask.request.args.get("before_id", type=int)
        page = flask.request.args.get("page", type=int)
        limit = min(
            flask.request.args.get(
                "limit", flask.request.args.get("per_page", 30, type=int), type=int
            ),
            100,
        )  # Máx 100 mensajes por lote

        if not finca_id:
            return APIResponse.error(
                "No se ha detectado el contexto de la finca", status_code=400
            )

        if recipient_id == user_id:
            return APIResponse.error(
                "No puede abrir un chat consigo mismo", status_code=400
            )
        if not _chat_recipient(recipient_id, finca_id):
            return APIResponse.forbidden(
                "El usuario no pertenece activamente a esta finca"
            )

        history_query = ChatMessage.query.filter(
            ChatMessage.finca_id == finca_id,
            db.or_(
                db.and_(
                    ChatMessage.sender_id == user_id,
                    ChatMessage.recipient_id == recipient_id,
                ),
                db.and_(
                    ChatMessage.sender_id == recipient_id,
                    ChatMessage.recipient_id == user_id,
                ),
            ),
        )

        has_more = False
        if before_id:
            # Consulta ultra-rápida por cursor inverso
            history_query = history_query.filter(ChatMessage.id < before_id)
            items_with_probe = history_query.order_by(ChatMessage.id.desc()).limit(limit + 1).all()
            if len(items_with_probe) > limit:
                has_more = True
                history_items = items_with_probe[:limit]
            else:
                history_items = items_with_probe
        elif page:
            # Compatibilidad con paginación tradicional
            history_paginated = history_query.order_by(ChatMessage.id.desc()).paginate(
                page=page, per_page=limit, error_out=False
            )
            history_items = history_paginated.items
            has_more = history_paginated.has_next
        else:
            # Carga inicial por defecto (últimos N mensajes)
            items_with_probe = history_query.order_by(ChatMessage.id.desc()).limit(limit + 1).all()
            if len(items_with_probe) > limit:
                has_more = True
                history_items = items_with_probe[:limit]
            else:
                history_items = items_with_probe

        # Marcar como leídos los mensajes que recibe el usuario
        unread = [
            m
            for m in history_items
            if m.recipient_id == user_id and not m.is_read
        ]
        if unread:
            read_at = datetime.now(UTC).replace(tzinfo=None)
            for m in unread:
                m.is_read = True
                m.read_at = read_at
            db.session.commit()
            cache.delete(f"chat_unread_{finca_id}_{user_id}")
            EventService.emit_chat_read(
                message_ids=[m.id for m in unread],
                sender_id=recipient_id,
                reader_id=user_id,
                finca_id=finca_id,
            )

        # Entregar la conversación en orden cronológico ascendente para renderizar
        messages_data = [msg.to_dict() for msg in reversed(history_items)]
        oldest_id = messages_data[0]["id"] if messages_data else None

        return APIResponse.success(
            data=messages_data,
            meta={
                "has_more": has_more,
                "oldest_id": oldest_id,
                "limit": limit,
            },
        )


@chat_ns.route("/upload")
class ChatUploadResource(Resource):
    @jwt_required()
    def post(self):
        """Subir archivo para adjuntar en chat."""
        user_id = _identity_as_int()
        finca_id = get_current_finca_id()

        if not finca_id:
            return APIResponse.error(
                "No se ha detectado el contexto de la finca", status_code=400
            )

        if "file" not in flask.request.files:
            return APIResponse.error("No se envió ningún archivo", status_code=400)

        file = flask.request.files["file"]
        if file.filename == "":
            return APIResponse.error("Nombre de archivo vacío", status_code=400)

        try:
            # Usar función de almacenamiento centralizada
            file_info = save_chat_file(file, finca_id)

            return APIResponse.success(
                data={
                    "url": file_info["url"],
                    "type": file_info["type"],
                    "name": file_info["name"],
                    "file_size": file_info.get("file_size"),
                    "extension": file_info.get("extension"),
                    "mime_type": file_info.get("mime_type"),
                },
                message="Archivo subido exitosamente",
            )

        except ValueError as e:
            return APIResponse.error(str(e), status_code=400)
        except Exception as e:
            logger.error(f"Error subiendo archivo de chat: {e}")
            return APIResponse.error("Error al subir el archivo", status_code=500)


@chat_ns.route("/send")
class ChatSendResource(Resource):
    @jwt_required()
    @chat_ns.expect(message_model)
    def post(self):
        """Enviar un mensaje de chat."""
        user_id = _identity_as_int()
        finca_id = get_current_finca_id()
        data = flask.request.get_json(silent=True) or {}

        if not finca_id:
            return APIResponse.error(
                "No se ha detectado el contexto de la finca", status_code=400
            )

        try:
            recipient_id = int(data.get("recipient_id"))
        except (TypeError, ValueError):
            recipient_id = 0
        message = data.get("message", "").strip()
        client_message_id = str(data.get("client_message_id") or "").strip() or None
        attachment_url = data.get("attachment_url")
        attachment_type = data.get("attachment_type")
        attachment_name = data.get("attachment_name")

        if not recipient_id:
            return APIResponse.error(
                "recipient_id es requerido", status_code=400
            )
        if not message and not attachment_url:
            return APIResponse.error(
                "Debe enviar un mensaje de texto o un archivo adjunto", status_code=400
            )
        if not message and attachment_url:
            message = attachment_name or "Archivo adjunto"
        if recipient_id == user_id:
            return APIResponse.error(
                "No puede enviarse mensajes a sí mismo", status_code=400
            )
        if client_message_id and len(client_message_id) > 64:
            return APIResponse.error(
                "client_message_id supera 64 caracteres", status_code=400
            )
        if not _chat_recipient(recipient_id, finca_id):
            return APIResponse.forbidden(
                "El destinatario no pertenece activamente a esta finca"
            )

        try:
            if client_message_id:
                idempotency_key = f"chat_idempotency_{user_id}_{client_message_id}"
                cached_message = cache.get(idempotency_key)
                existing = (
                    db.session.get(ChatMessage, cached_message.get("id"))
                    if isinstance(cached_message, dict) and cached_message.get("id")
                    else None
                )
                if existing:
                    if (
                        existing.recipient_id != recipient_id
                        or existing.message != message
                        or cached_message.get("recipient_id") != recipient_id
                    ):
                        return APIResponse.error(
                            "El identificador del mensaje ya fue usado con otro contenido",
                            status_code=409,
                        )
                    existing.client_message_id = client_message_id
                    return APIResponse.success(
                        data=existing.to_dict(), message="Mensaje ya confirmado"
                    )

            chat_message = ChatMessage(
                sender_id=user_id,
                recipient_id=recipient_id,
                message=message,
                attachment_url=attachment_url,
                attachment_type=attachment_type,
                attachment_name=attachment_name,
                finca_id=finca_id,
            )

            db.session.add(chat_message)
            db.session.commit()
            chat_message.client_message_id = client_message_id

            if client_message_id:
                cache.set(
                    f"chat_idempotency_{user_id}_{client_message_id}",
                    {
                        "id": chat_message.id,
                        "recipient_id": recipient_id,
                        "message": message,
                    },
                    timeout=86_400,
                )

            # Invalidar caches relevantes
            cache_keys_to_clear = [
                f"chat_unread_{finca_id}_{recipient_id}",
                f"chat_unread_{finca_id}_{user_id}",
            ]

            for key in cache_keys_to_clear:
                cache.delete(key)

            # Emitir evento SSE
            EventService.emit_chat_message(chat_message.to_dict())

            return APIResponse.success(
                data=chat_message.to_dict(), message="Mensaje enviado"
            )

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error sending message: {e}")
            return APIResponse.error("Error al enviar mensaje", status_code=500)


@chat_ns.route("/unread-count")
class ChatUnreadResource(Resource):
    @jwt_required()
    def get(self):
        """Obtener contador de mensajes no leídos."""
        user_id = _identity_as_int()
        finca_id = get_current_finca_id()

        # Cache muy corto para unread count (datos muy dinámicos)
        cache_key = f"chat_unread_{finca_id}_{user_id}"
        cached_count = cache.get(cache_key)

        if cached_count is not None:
            return APIResponse.success(data={"unread_count": cached_count})

        # Consulta optimizada
        count = (
            db.session.query(db.func.count(ChatMessage.id))
            .filter(
                ChatMessage.recipient_id == user_id,
                ChatMessage.finca_id == finca_id,
                ChatMessage.is_read == False,
            )
            .scalar()
        )

        # Cache por 15 segundos
        cache.set(cache_key, count, timeout=15)

        return APIResponse.success(data={"unread_count": count})
