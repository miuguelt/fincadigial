from app import db
from app.models.base_model import BaseModel


class SystemContent(BaseModel):
    """Contenido predefinido del sistema almacenado en BD.
    Reemplaza todas las respuestas generadas por IA, contenido hardcodeado
    y configuraciones que antes vivían en código fuente.
    """

    __tablename__ = "system_contents"
    __table_args__ = (
        db.Index("ix_system_content_key", "key"),
        db.Index("ix_system_content_category", "category"),
        db.UniqueConstraint("key", "finca_id", name="uq_system_content_key_finca"),
    )

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(120), nullable=False)
    category = db.Column(db.String(50), nullable=False, default="content")
    content_type = db.Column(db.String(50), nullable=True)
    priority = db.Column(db.String(20), nullable=True)
    title = db.Column(db.String(300), nullable=True)
    content = db.Column(db.Text, nullable=False)
    extra = db.Column(db.JSON, nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    finca_id = db.Column(db.Integer, db.ForeignKey("finca.id"), nullable=True)

    _namespace_fields = [
        "id",
        "key",
        "category",
        "content_type",
        "priority",
        "title",
        "content",
        "extra",
        "is_active",
        "finca_id",
        "created_at",
        "updated_at",
    ]
    _filterable_fields = [
        "key",
        "category",
        "content_type",
        "priority",
        "is_active",
        "finca_id",
    ]
    _searchable_fields = ["key", "title", "content"]
    _sortable_fields = ["id", "key", "category", "created_at"]

    @classmethod
    def get_by_key(cls, key: str, finca_id: int = None) -> "SystemContent":
        query = cls.query.filter_by(key=key, is_active=True)
        if finca_id:
            query = query.filter((cls.finca_id == finca_id) | (cls.finca_id.is_(None)))
        return query.order_by(cls.finca_id.desc().nullslast()).first()

    @classmethod
    def get_by_category(
        cls, category: str, finca_id: int = None, content_type: str = None
    ):
        query = cls.query.filter_by(category=category, is_active=True)
        if content_type:
            query = query.filter_by(content_type=content_type)
        if finca_id:
            query = query.filter((cls.finca_id == finca_id) | (cls.finca_id.is_(None)))
        return query.order_by(cls.finca_id.desc().nullslast()).all()

    @classmethod
    def bulk_upsert(cls, items: list[dict]):
        """Crea o actualiza múltiples entradas por key+finca_id."""
        for item in items:
            existing = cls.query.filter_by(
                key=item["key"],
                finca_id=item.get("finca_id"),
            ).first()
            if existing:
                for k, v in item.items():
                    if k != "key" and hasattr(existing, k):
                        setattr(existing, k, v)
            else:
                obj = cls(**item)
                db.session.add(obj)
        db.session.commit()
