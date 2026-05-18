import uuid
import flask
from flask_restx import Namespace, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.node_message import NodeMessage, NodeMessageType
from app.utils.response_handler import APIResponse
from app.utils.tenant_context import get_current_finca_id


node_messages_ns = Namespace("node-messages", description="Mensajeria persistente entre nodos")


def _message_dict(msg: NodeMessage):
    return {
        "id": msg.id,
        "message_id": msg.message_id,
        "sender_user_id": msg.sender_user_id,
        "sender_device_id": msg.sender_device_id,
        "recipient_user_id": msg.recipient_user_id,
        "recipient_node_id": msg.recipient_node_id,
        "message_type": msg.message_type.value if hasattr(msg.message_type, "value") else msg.message_type,
        "content": msg.content,
        "status": msg.status.value if hasattr(msg.status, "value") else msg.status,
        "priority": msg.priority,
        "finca_id": msg.finca_id,
        "created_at": msg.created_at.isoformat() if msg.created_at else None,
    }


@node_messages_ns.route("")
class NodeMessagesResource(Resource):
    @jwt_required()
    def get(self):
        finca_id = get_current_finca_id() or flask.request.args.get("finca_id", type=int)
        user_id = get_jwt_identity()
        node_id = flask.request.args.get("node_id")
        limit = min(flask.request.args.get("limit", 50, type=int), 200)
        if not finca_id:
            return APIResponse.error("finca_id es requerido", status_code=400)

        query = NodeMessage.query.filter_by(finca_id=finca_id)
        if node_id:
            query = query.filter(db.or_(
                NodeMessage.recipient_node_id == node_id,
                NodeMessage.sender_device_id == node_id,
            ))
        else:
            query = query.filter(db.or_(
                NodeMessage.recipient_user_id == user_id,
                NodeMessage.sender_user_id == user_id,
            ))
        messages = query.order_by(NodeMessage.created_at.desc()).limit(limit).all()
        return APIResponse.success([_message_dict(msg) for msg in messages])

    @jwt_required()
    def post(self):
        payload = flask.request.get_json(silent=True) or {}
        finca_id = get_current_finca_id() or payload.get("finca_id")
        user_id = get_jwt_identity()
        content = (payload.get("content") or "").strip()
        if not finca_id or not content:
            return APIResponse.validation_error({"finca_id": "requerido", "content": "requerido"})

        msg_type = payload.get("message_type") or payload.get("type") or "chat"
        try:
            msg_type = NodeMessageType(msg_type)
        except Exception:
            msg_type = NodeMessageType.CHAT

        msg = NodeMessage(
            message_id=payload.get("message_id") or str(uuid.uuid4()),
            sender_user_id=user_id,
            sender_device_id=payload.get("sender_device_id"),
            recipient_user_id=payload.get("recipient_user_id"),
            recipient_node_id=payload.get("recipient_node_id"),
            message_type=msg_type,
            content=content,
            priority=int(payload.get("priority") or (10 if msg_type == NodeMessageType.ALERT else 100)),
            finca_id=finca_id,
        )
        db.session.add(msg)
        db.session.commit()
        return APIResponse.success(_message_dict(msg), message="Mensaje encolado", status_code=201)
