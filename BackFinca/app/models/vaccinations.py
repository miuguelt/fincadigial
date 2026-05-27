from app import db
from app.models.base_model import BaseModel

class Vaccinations(BaseModel):
    """Modelo para vacunaciones aplicadas a animales optimizado para namespaces"""
    __tablename__ = "vaccinations"
    # Índices de rendimiento para historial de vacunaciones y consultas recientes
    __table_args__ = (
        db.Index('ix_vaccinations_animal_date', 'animal_id', 'vaccination_date'),
        db.Index('ix_vaccinations_created_at', 'created_at'),
        db.Index('ix_vaccinations_finca_id', 'finca_id'),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=False)
    vaccine_id = db.Column(db.Integer, db.ForeignKey('vaccines.id'), nullable=False)
    vaccination_date = db.Column(db.Date, nullable=False)
    dosis = db.Column(db.String(100), nullable=True)           # Dosis aplicada (ej: "2ml SC")
    batch_number = db.Column(db.String(80), nullable=True)    # Número de lote del producto
    next_due_date = db.Column(db.Date, nullable=True)         # Fecha próxima aplicación
    notes = db.Column(db.String(500), nullable=True)          # Observaciones del aplicador
    performed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)  # Quien aplicó
    apprentice_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    instructor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    finca_id      = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)
    kb_codigo     = db.Column(db.String(20), nullable=True)           # Vinculo con KB Calendario

    # Configuración específica para namespaces
    _namespace_fields = [
        'id', 'animal_id', 'vaccine_id', 'vaccination_date', 'dosis', 'batch_number',
        'next_due_date', 'notes', 'performed_by', 'apprentice_id', 'instructor_id',
        'finca_id', 'kb_codigo', 'created_at', 'updated_at'
    ]
    _namespace_relations = {
        'animals': {'fields': ['id', 'record', 'sex', 'status'], 'depth': 1},
        'vaccines': {'fields': ['id', 'name', 'type'], 'depth': 1},
        'apprentice': {'fields': ['id', 'fullname', 'role'], 'depth': 1},
        'instructor': {'fields': ['id', 'fullname', 'role'], 'depth': 1}
    }
    _searchable_fields = []
    _filterable_fields = ['animal_id', 'vaccine_id', 'instructor_id', 'apprentice_id', 'vaccination_date', 'finca_id', 'created_at']
    _sortable_fields = ['id', 'vaccination_date', 'created_at', 'updated_at']
    # Allow instructor_id optional for test scenarios where an instructor entity isn't present
    _required_fields = ['animal_id', 'vaccine_id', 'vaccination_date']
    _unique_fields = []

    # Relaciones optimizadas
    animals = db.relationship('Animals', back_populates='vaccinations', lazy='selectin')
    vaccines = db.relationship('Vaccines', back_populates='vaccinations', lazy='selectin')
    performer = db.relationship('User', foreign_keys=[performed_by], lazy='selectin')
    apprentice = db.relationship('User', foreign_keys=[apprentice_id], back_populates='vaccines_as_apprentice', lazy='selectin')
    instructor = db.relationship('User', foreign_keys=[instructor_id], back_populates='vaccines_as_instructor', lazy='selectin')

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if 'vaccination_date' in data and not data['vaccination_date']:
            errors.append("La fecha de vacunación no puede estar vacía")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError
            raise ValidationError('; '.join(errors), code="validation_error")

    def __repr__(self):
        return f'<Vaccination {self.id}: Animal {self.animal_id} - Vaccine {self.vaccine_id}>'
