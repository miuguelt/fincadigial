from app import db
from datetime import datetime


class ChatMessage(db.Model):
    __tablename__ = "chat_messages"
    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id"), nullable=False, index=True
    )
    sender_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    recipient_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    attachment_url = db.Column(db.String(500), nullable=True)
    attachment_type = db.Column(db.String(50), nullable=True)  # 'image', 'file'
    attachment_name = db.Column(db.String(255), nullable=True)
    is_read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relaciones
    sender = db.relationship("User", foreign_keys=[sender_id], backref="sent_messages")
    recipient = db.relationship(
        "User", foreign_keys=[recipient_id], backref="received_messages"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "finca_id": self.finca_id,
            "sender_id": self.sender_id,
            "sender_name": self.sender.fullname if self.sender else "Usuario",
            "recipient_id": self.recipient_id,
            "recipient_name": self.recipient.fullname if self.recipient else "Usuario",
            # Estos metadatos se adjuntan al objeto durante la solicitud. No
            # exigen alterar instalaciones existentes de PostgreSQL.
            "client_message_id": getattr(self, "client_message_id", None),
            "message": self.message,
            "attachment_url": self.attachment_url,
            "attachment_type": self.attachment_type,
            "attachment_name": self.attachment_name,
            "is_read": self.is_read,
            "read_at": (
                getattr(self, "read_at", None).isoformat()
                if getattr(self, "read_at", None)
                else None
            ),
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def get_history(cls, user_a_id, user_b_id, finca_id, limit=50):
        """Obtener historial de chat entre dos usuarios."""
        return (
            cls.query.filter(
                cls.finca_id == finca_id,
                ((cls.sender_id == user_a_id) & (cls.recipient_id == user_b_id))
                | ((cls.sender_id == user_b_id) & (cls.recipient_id == user_a_id)),
            )
            .order_by(cls.created_at.asc())
            .limit(limit)
            .all()
        )

    @classmethod
    def get_unread_count(cls, user_id, finca_id):
        """Contar mensajes no leídos para un usuario."""
        return cls.query.filter_by(
            recipient_id=user_id, finca_id=finca_id, is_read=False
        ).count()
