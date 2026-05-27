from app import db
from datetime import datetime, UTC, timedelta
import enum
import secrets
import hashlib
import logging

logger = logging.getLogger(__name__)


class JoinRequestStatus(enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class JoinRequestType(enum.Enum):
    REQUEST = "request"
    INVITATION = "invitation"


class InvitationMethod(enum.Enum):
    EMAIL = "email"
    LINK = "link"
    QR = "qr"
    CODE = "code"


class JoinRequest(db.Model):
    """Solicitudes e invitaciones de membresía con tokens seguros."""
    __tablename__ = 'join_requests'
    __table_args__ = (
        db.Index('ix_join_request_user_finca', 'user_id', 'finca_id'),
        db.Index('ix_join_request_status', 'status'),
        db.Index('ix_join_request_type', 'request_type'),
        db.Index('ix_join_request_token', 'invitation_token'),
        db.Index('ix_join_request_expires', 'expires_at'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id', ondelete='CASCADE'), nullable=False)

    request_type = db.Column(db.Enum(JoinRequestType), default=JoinRequestType.REQUEST, nullable=False)
    status = db.Column(db.Enum(JoinRequestStatus), default=JoinRequestStatus.PENDING, nullable=False)
    requested_role = db.Column(db.String(50), default="Operario", nullable=False)
    notes = db.Column(db.String(255), nullable=True)

    invitation_token = db.Column(db.String(128), unique=True, nullable=True)
    token_hash = db.Column(db.String(256), nullable=True)
    invitation_method = db.Column(db.Enum(InvitationMethod), nullable=True)
    max_uses = db.Column(db.Integer, default=1, nullable=False)
    current_uses = db.Column(db.Integer, default=0, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=True)

    processed_at = db.Column(db.DateTime, nullable=True)
    processed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    rejection_reason = db.Column(db.String(255), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), nullable=False)
    updated_at = db.Column(db.DateTime, default=lambda: datetime.now(UTC), onupdate=lambda: datetime.now(UTC))

    user = db.relationship('User', foreign_keys=[user_id], backref='join_requests')
    finca = db.relationship('Finca', backref='join_requests')
    processor = db.relationship('User', foreign_keys=[processed_by], lazy='selectin')

    @classmethod
    def generate_token(cls) -> str:
        return secrets.token_urlsafe(32)

    @classmethod
    def hash_token(cls, token: str) -> str:
        return hashlib.sha256(token.encode()).hexdigest()

    @classmethod
    def create_invitation(cls, user_id: int, finca_id: int, role: str = "Operario",
                          notes: str = None, expires_hours: int = 72,
                          method: InvitationMethod = InvitationMethod.LINK,
                          max_uses: int = 1) -> tuple['JoinRequest', str]:
        token = cls.generate_token()
        req = cls(
            user_id=user_id,
            finca_id=finca_id,
            request_type=JoinRequestType.INVITATION,
            requested_role=role,
            notes=notes,
            invitation_token=token,
            token_hash=cls.hash_token(token),
            invitation_method=method,
            max_uses=max_uses,
            expires_at=datetime.now(UTC) + timedelta(hours=expires_hours),
        )
        db.session.add(req)
        db.session.commit()
        logger.info(f"Invitation created: id={req.id} token_hash={req.token_hash[:8]}...")
        return req, token

    @classmethod
    def find_by_token(cls, token: str) -> 'JoinRequest | None':
        token_hash = cls.hash_token(token)
        return cls.query.filter_by(
            token_hash=token_hash,
            status=JoinRequestStatus.PENDING
        ).first()

    def is_expired(self) -> bool:
        if not self.expires_at:
            return False
        return datetime.now(UTC) > self.expires_at

    def is_valid(self) -> bool:
        if self.status != JoinRequestStatus.PENDING:
            return False
        if self.is_expired():
            return True
        if self.current_uses >= self.max_uses:
            return True
        return False

    def mark_expired(self):
        self.status = JoinRequestStatus.EXPIRED
        self.updated_at = datetime.now(UTC)

    def accept(self, user_id: int):
        self.status = JoinRequestStatus.APPROVED
        self.current_uses += 1
        self.processed_at = datetime.now(UTC)
        self.processed_by = user_id
        self.updated_at = datetime.now(UTC)

    def reject(self, user_id: int, reason: str = None):
        self.status = JoinRequestStatus.REJECTED
        self.rejection_reason = reason
        self.processed_at = datetime.now(UTC)
        self.processed_by = user_id
        self.updated_at = datetime.now(UTC)

    def cancel(self, user_id: int):
        self.status = JoinRequestStatus.CANCELLED
        self.processed_at = datetime.now(UTC)
        self.processed_by = user_id
        self.updated_at = datetime.now(UTC)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_fullname': self.user.fullname if self.user else 'N/A',
            'user_ident': self.user.identification if self.user else 'N/A',
            'user_email': self.user.email if self.user else 'N/A',
            'finca_id': self.finca_id,
            'finca_name': self.finca.name if self.finca else 'N/A',
            'type': self.request_type.value,
            'status': self.status.value,
            'requested_role': self.requested_role,
            'notes': self.notes,
            'invitation_method': self.invitation_method.value if self.invitation_method else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'is_expired': self.is_expired(),
            'max_uses': self.max_uses,
            'current_uses': self.current_uses,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'processed_at': self.processed_at.isoformat() if self.processed_at else None,
            'rejection_reason': self.rejection_reason,
        }
