from app import db
from app.models.base_model import BaseModel


class UserFavorite(BaseModel):
    """Favoritos de usuario persistidos en BD."""
    __tablename__ = 'user_favorites'
    __table_args__ = (
        db.Index('ix_user_favorites_user', 'user_id'),
        db.UniqueConstraint('user_id', 'endpoint', name='uq_user_favorite_endpoint'),
    )

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    endpoint = db.Column(db.String(255), nullable=False)
    label = db.Column(db.String(255), nullable=True)
    method = db.Column(db.String(10), default='GET')

    _namespace_fields = ['id', 'user_id', 'endpoint', 'label', 'method', 'created_at']
    _filterable_fields = ['user_id']
    _sortable_fields = ['id', 'created_at']
    _required_fields = ['user_id', 'endpoint']
