from app import db
from datetime import datetime, timezone
import enum

class JoinRequestStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class JoinRequestType(enum.Enum):
    REQUEST = "request"       # Usuario -> Finca
    INVITATION = "invitation" # Finca -> Usuario

class JoinRequest(db.Model):
    """
    Almacena las solicitudes e invitaciones de membresía.
    """
    __tablename__ = 'join_requests'
    __table_args__ = (
        db.Index('ix_join_request_user_finca', 'user_id', 'finca_id'),
        db.Index('ix_join_request_status', 'status'),
        db.Index('ix_join_request_type', 'request_type'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id', ondelete='CASCADE'), nullable=False)
    
    request_type = db.Column(db.Enum(JoinRequestType), default=JoinRequestType.REQUEST, nullable=False)
    status = db.Column(db.Enum(JoinRequestStatus), default=JoinRequestStatus.PENDING, nullable=False)
    requested_role = db.Column(db.String(50), default="Operario", nullable=False)
    notes = db.Column(db.String(255), nullable=True)
    
    # Respuesta/Procesamiento
    processed_at = db.Column(db.DateTime, nullable=True)
    processed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    rejection_reason = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    # Relaciones
    user = db.relationship('User', foreign_keys=[user_id], backref='join_requests')
    finca = db.relationship('Finca', backref='join_requests')

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_fullname': self.user.fullname if self.user else 'N/A',
            'user_ident': self.user.identification if self.user else 'N/A',
            'finca_id': self.finca_id,
            'finca_name': self.finca.name if self.finca else 'N/A',
            'type': self.request_type.value,
            'status': self.status.value,
            'requested_role': self.requested_role,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
