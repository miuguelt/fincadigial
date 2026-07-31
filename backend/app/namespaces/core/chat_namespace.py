import flask
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models.chat_message import ChatMessage
from app.models.user import User
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id
from app.utils.file_storage import save_chat_file
from app.services.event_service import EventService
from app import db, cache
import logging

logger = logging.getLogger(__name__)

chat_ns = Namespace('chat', description='Operaciones de chat interno')

message_model = chat_ns.model('ChatMessage', {
    'recipient_id': fields.Integer(required=True, description='ID del destinatario'),
    'message': fields.String(required=True, description='Contenido del mensaje'),
    'attachment_url': fields.String(required=False, description='URL del archivo adjunto'),
    'attachment_type': fields.String(required=False, description='Tipo de archivo (image/file)'),
    'attachment_name': fields.String(required=False, description='Nombre del archivo')
})


@chat_ns.route('/contacts')
class ChatContactsResource(Resource):
    @jwt_required()
    def get(self):
        """Listar usuarios en la misma finca para chatear."""
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id()

        if not finca_id:
            return APIResponse.error('No se ha detectado el contexto de la finca', status_code=400)

        # Cache key incluye user_id y finca_id para evitar datos incorrectos
        cache_key = f"chat_contacts_{user_id}_{finca_id}"

        # Intentar obtener del cache primero
        cached_data = cache.get(cache_key)
        if cached_data:
            return APIResponse.success(data=cached_data)

        # Obtener todos los usuarios activos de la finca excepto el actual
        # Optimizado: solo seleccionar campos necesarios
        contacts = User.query.filter(
            User.finca_id == finca_id,
            User.id != user_id,
            User.status == True
        ).with_entities(
            User.id,
            User.fullname,
            User.role,
            User.email
        ).all()

        # Transformar datos
        contacts_data = [{
            'id': c.id,
            'fullname': c.fullname,
            'role': c.role.value if hasattr(c.role, 'value') else c.role,
            'email': c.email
        } for c in contacts]

        # Guardar en cache
        cache.set(cache_key, contacts_data, timeout=300)

        return APIResponse.success(data=contacts_data)

@chat_ns.route('/history/<int:recipient_id>')
class ChatHistoryResource(Resource):
    @jwt_required()
    def get(self, recipient_id):
        """Obtener historial de mensajes con un usuario."""
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id()

        # Parámetros de paginación
        page = flask.request.args.get('page', 1, type=int)
        per_page = min(flask.request.args.get('per_page', 50, type=int), 100)  # Máx 100 mensajes

        if not finca_id:
            return APIResponse.error('No se ha detectado el contexto de la finca', status_code=400)

        # Cache key para historial (corta duración por ser datos dinámicos)
        cache_key = f"chat_history_{finca_id}_{user_id}_{recipient_id}_{page}_{per_page}"

        # Para polling reciente, usar cache muy corto
        cache_timeout = 30 if page == 1 else 300  # 30s para primera página, 5min para antiguas

        cached_data = cache.get(cache_key)
        if cached_data:
            return APIResponse.success(data=cached_data)

        # Consulta optimizada con paginación
        history_query = ChatMessage.query.filter(
            ChatMessage.finca_id == finca_id,
            db.or_(
                db.and_(ChatMessage.sender_id == user_id, ChatMessage.recipient_id == recipient_id),
                db.and_(ChatMessage.sender_id == recipient_id, ChatMessage.recipient_id == user_id)
            )
        ).order_by(ChatMessage.created_at.desc())

        # Paginar
        history_paginated = history_query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        # Transformar datos
        messages_data = [msg.to_dict() for msg in history_paginated.items]

        # Marcar como leídos
        unread = [m for m in history_paginated.items if m.recipient_id == user_id and not m.is_read]
        if unread:
            for m in unread:
                m.is_read = True
            db.session.commit()

        # Guardar en cache
        cache.set(cache_key, messages_data, timeout=cache_timeout)

        return APIResponse.success(data=messages_data)

@chat_ns.route('/upload')
class ChatUploadResource(Resource):
    @jwt_required()
    def post(self):
        """Subir archivo para adjuntar en chat."""
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id()

        if not finca_id:
            return APIResponse.error('No se ha detectado el contexto de la finca', status_code=400)

        if 'file' not in flask.request.files:
            return APIResponse.error('No se envió ningún archivo', status_code=400)

        file = flask.request.files['file']
        if file.filename == '':
            return APIResponse.error('Nombre de archivo vacío', status_code=400)

        try:
            # Usar función de almacenamiento centralizada
            file_info = save_chat_file(file, finca_id)

            return APIResponse.success(data={
                'url': file_info['url'],
                'type': file_info['type'],
                'name': file_info['name']
            }, message='Archivo subido exitosamente')

        except ValueError as e:
            return APIResponse.error(str(e), status_code=400)
        except Exception as e:
            logger.error(f"Error subiendo archivo de chat: {e}")
            return APIResponse.error('Error al subir el archivo', status_code=500)

@chat_ns.route('/send')
class ChatSendResource(Resource):
    @jwt_required()
    @chat_ns.expect(message_model)
    def post(self):
        """Enviar un mensaje de chat."""
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id()
        data = flask.request.json

        if not finca_id:
            return APIResponse.error('No se ha detectado el contexto de la finca', status_code=400)

        recipient_id = data.get('recipient_id')
        message = data.get('message', '').strip()
        attachment_url = data.get('attachment_url')
        attachment_type = data.get('attachment_type')
        attachment_name = data.get('attachment_name')

        if not recipient_id or not message:
            return APIResponse.error('recipient_id y message son requeridos', status_code=400)

        try:
            chat_message = ChatMessage(
                sender_id=user_id,
                recipient_id=recipient_id,
                message=message,
                attachment_url=attachment_url,
                attachment_type=attachment_type,
                attachment_name=attachment_name,
                finca_id=finca_id
            )

            db.session.add(chat_message)
            db.session.commit()

            # Invalidar caches relevantes
            cache_keys_to_clear = [
                f"chat_history_{finca_id}_{user_id}_{recipient_id}_1_50",
                f"chat_history_{finca_id}_{recipient_id}_{user_id}_1_50",
                f"chat_unread_{finca_id}_{recipient_id}",
                f"chat_unread_{finca_id}_{user_id}"
            ]

            for key in cache_keys_to_clear:
                cache.delete(key)

            # Emitir evento SSE
            EventService.emit_chat_message(chat_message.to_dict())

            return APIResponse.success(data=chat_message.to_dict(), message='Mensaje enviado')

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error sending message: {e}")
            return APIResponse.error('Error al enviar mensaje', status_code=500)

@chat_ns.route('/unread-count')
class ChatUnreadResource(Resource):
    @jwt_required()
    def get(self):
        """Obtener contador de mensajes no leídos."""
        user_id = get_jwt_identity()
        finca_id = get_current_finca_id()

        # Cache muy corto para unread count (datos muy dinámicos)
        cache_key = f"chat_unread_{finca_id}_{user_id}"
        cached_count = cache.get(cache_key)

        if cached_count is not None:
            return APIResponse.success(data={'unread_count': cached_count})

        # Consulta optimizada
        count = db.session.query(db.func.count(ChatMessage.id)).filter(
            ChatMessage.recipient_id == user_id,
            ChatMessage.finca_id == finca_id,
            ChatMessage.is_read == False
        ).scalar()

        # Cache por 15 segundos
        cache.set(cache_key, count, timeout=15)

        return APIResponse.success(data={'unread_count': count})
