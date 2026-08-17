from app import db
from app.models.base_model import BaseModel
import enum


class RequestStatus(enum.Enum):
    Pending = "Pending"
    Approved = "Approved"
    Rejected = "Rejected"

    @classmethod
    def get_choices(cls):
        return [(c.value, c.value) for c in cls]


class MembershipRequest(BaseModel):
    __tablename__ = "membership_request"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=False)
    finca_id = db.Column(
        db.Integer, db.ForeignKey("finca.id"), nullable=False, index=True
    )
    status = db.Column(
        db.Enum(RequestStatus), default=RequestStatus.Pending, nullable=False
    )
    requested_role = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=True)
    processed_by = db.Column(db.Integer, db.ForeignKey("user.id"), nullable=True)
    processed_at = db.Column(db.DateTime, nullable=True)

    # Relaciones
    user = db.relationship(
        "User", foreign_keys=[user_id], backref="membership_requests"
    )
    finca = db.relationship("Finca", backref="membership_requests")
    processor = db.relationship(
        "User", foreign_keys=[processed_by], backref="processed_requests"
    )

    _namespace_fields = [
        "id",
        "user_id",
        "finca_id",
        "status",
        "requested_role",
        "message",
        "processed_by",
        "processed_at",
        "created_at",
        "updated_at",
    ]
    _namespace_relations = {
        "user": {"fields": ["id", "fullname", "email", "identification"]},
        "finca": {"fields": ["id", "name"]},
    }
    _filterable_fields = ["status", "finca_id", "user_id"]
    _sortable_fields = ["id", "created_at", "updated_at", "processed_at"]

    def __repr__(self):
        return f"<MembershipRequest {self.id}: User {self.user_id} -> Finca {self.finca_id}>"
