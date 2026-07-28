from app import db
from app.models.base_model import BaseModel


class FincaImages(BaseModel):
    __tablename__ = 'finca_images'

    __table_args__ = (
        db.Index('ix_finca_images_finca_id', 'finca_id'),
        db.Index('ix_finca_images_is_primary', 'is_primary'),
        db.Index('ix_finca_images_created_at', 'created_at'),
    )

    id = db.Column(db.Integer, primary_key=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id', ondelete='CASCADE'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    filepath = db.Column(db.String(500), nullable=False)
    thumbnail_path = db.Column(db.String(500), nullable=True)
    file_size = db.Column(db.Integer, nullable=True)
    mime_type = db.Column(db.String(100), nullable=True)
    is_primary = db.Column(db.Boolean, default=False, nullable=False)

    _namespace_fields = ['id', 'finca_id', 'filename', 'filepath', 'file_size', 'mime_type', 'is_primary', 'created_at', 'updated_at']
    _namespace_relations = {
        'finca': {'fields': ['id', 'name'], 'depth': 1}
    }
    _searchable_fields = ['filename']
    _filterable_fields = ['finca_id', 'is_primary', 'mime_type', 'created_at']
    _sortable_fields = ['id', 'filename', 'created_at', 'is_primary']
    _required_fields = ['finca_id', 'filename', 'filepath']

    finca = db.relationship('Finca', backref='images', lazy='selectin')

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        data = super().to_namespace_dict(include_relations, depth, fields)
        from app.utils.file_storage import get_public_url
        data['url'] = get_public_url(self.filepath)
        if self.thumbnail_path:
            data['thumbnail_url'] = get_public_url(self.thumbnail_path)
        else:
            data['thumbnail_url'] = data['url']
        return data

    def __repr__(self):
        return f'<FincaImage {self.id}: {self.filename}>'
