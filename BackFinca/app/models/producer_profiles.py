from app import db
from app.models.base_model import BaseModel
import enum

class ProducerType(enum.Enum):
    Subsistencia = "Subsistencia"
    Comercial_Pequeno = "Comercial Pequeño"
    Comercial_Mediano = "Comercial Mediano"
    Educativo = "Educativo / Estudiante"
    Institucional = "Institucional"

class ProducerProfile(BaseModel):
    """Modelo extendido del perfil rural/campesino del usuario"""
    __tablename__ = "producer_profiles"
    __table_args__ = (
        db.Index('ix_producer_profile_user', 'user_id', unique=True),
        db.Index('ix_producer_type', 'producer_type'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False, unique=True)
    producer_type = db.Column(db.Enum(ProducerType), nullable=False, default=ProducerType.Subsistencia)
    certifications = db.Column(db.String(255), nullable=True)     # Ej: "BPA, BPG"
    has_credit_access = db.Column(db.Boolean, default=False)
    association_name = db.Column(db.String(200), nullable=True)   # Gremio o cooperativa
    years_experience = db.Column(db.Integer, nullable=True)
    land_tenure = db.Column(db.String(100), nullable=True)        # Propia, Arrendada, Comunal
    notes = db.Column(db.Text, nullable=True)

    _namespace_fields = [
        'id', 'user_id', 'producer_type', 'certifications', 'has_credit_access',
        'association_name', 'years_experience', 'land_tenure', 'notes',
        'created_at', 'updated_at'
    ]
    _namespace_relations = {
        'user': {'fields': ['id', 'fullname', 'email', 'role'], 'depth': 1},
    }
    _searchable_fields = ['certifications', 'association_name', 'notes']
    _filterable_fields = ['producer_type', 'has_credit_access', 'land_tenure']
    _sortable_fields = ['id', 'years_experience', 'created_at']
    _required_fields = ['user_id', 'producer_type']
    _enum_fields = {'producer_type': ProducerType}

    # Relaciones
    user = db.relationship('User', backref=db.backref('producer_profile', uselist=False), lazy='selectin')

    def __repr__(self):
        return f'<ProducerProfile User={self.user_id} Type={self.producer_type.value}>'
