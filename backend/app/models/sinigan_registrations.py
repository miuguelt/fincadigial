from app import db
from app.models.base_model import BaseModel

class SiniganRegistrations(BaseModel):
    """Modelo para trazabilidad y registro SINIGAN (ICA)"""
    __tablename__ = "sinigan_registrations"
    __table_args__ = (
        db.Index('ix_sinigan_arete', 'arete_sinigan', unique=True),
        db.Index('ix_sinigan_animal_id', 'animal_id'),
        db.Index('ix_sinigan_finca_id', 'finca_id'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=False)
    arete_sinigan = db.Column(db.String(50), nullable=False, unique=True)
    fecha_registro = db.Column(db.Date, nullable=False)
    predio_origen = db.Column(db.String(150), nullable=True)
    guia_movilizacion = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.String(500), nullable=True)

    _namespace_fields = [
        'id', 'finca_id', 'animal_id', 'arete_sinigan', 'fecha_registro',
        'predio_origen', 'guia_movilizacion', 'notes', 'created_at', 'updated_at'
    ]
    _namespace_relations = {
        'animal': {'fields': ['id', 'record', 'sex', 'status'], 'depth': 1},
        'finca': {'fields': ['id', 'name'], 'depth': 1}
    }
    _searchable_fields = ['arete_sinigan', 'predio_origen', 'guia_movilizacion', 'notes']
    _filterable_fields = ['finca_id', 'animal_id', 'fecha_registro']
    _sortable_fields = ['id', 'fecha_registro', 'created_at']
    _required_fields = ['finca_id', 'animal_id', 'arete_sinigan', 'fecha_registro']
    _unique_fields = ['arete_sinigan']

    # Relaciones
    animal = db.relationship('Animals', backref='sinigan_info', lazy='selectin')
    finca = db.relationship('Finca', backref='sinigan_records', lazy='selectin')

    def __repr__(self):
        return f'<SiniganRegistration {self.arete_sinigan} - Animal {self.animal_id}>'
