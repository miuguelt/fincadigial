from app import db
from app.models.base_model import BaseModel

class AnimalDiseases(BaseModel):
    """Modelo para enfermedades diagnosticadas en animales"""
    __tablename__ = 'animal_diseases'
    __table_args__ = (
        db.UniqueConstraint('animal_id', 'disease_id', 'diagnosis_date', name='uq_animal_diseases_animal_disease_date'),
        db.Index('ix_animal_diseases_finca_id', 'finca_id'),
        db.Index('ix_animal_diseases_animal_id', 'animal_id'),
    )

    id = db.Column(db.Integer, autoincrement=True, primary_key=True)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=False)
    disease_id = db.Column(db.Integer, db.ForeignKey('diseases.id'), nullable=False)
    instructor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    diagnosis_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(50), nullable=False, default='Activo')
    # Notes optional to allow minimal test creation
    notes    = db.Column(db.Text, nullable=True)  # nullable for tests
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)

    # Relaciones
    animal     = db.relationship('Animals', back_populates='diseases', lazy='selectin')
    disease    = db.relationship('Diseases', back_populates='animals', lazy='selectin')
    instructor = db.relationship('User', back_populates='diseases', lazy='selectin')

    # Campos / relaciones para namespaces
    _namespace_fields = ['id', 'animal_id', 'disease_id', 'instructor_id', 'diagnosis_date', 'status', 'notes', 'finca_id', 'created_at', 'updated_at']
    _namespace_relations = {
        'animal': {'fields': ['id', 'record', 'sex', 'status'], 'depth': 1},
        'disease': {'fields': ['id', 'name'], 'depth': 1},
        'instructor': {'fields': ['id', 'fullname', 'role'], 'depth': 1}
    }
    # Configuraciones del modelo base
    _searchable_fields = ['notes', 'status']
    _filterable_fields = ['animal_id', 'disease_id', 'instructor_id', 'status', 'diagnosis_date', 'finca_id']
    _sortable_fields = ['id', 'diagnosis_date']
    _required_fields = ['animal_id', 'disease_id', 'instructor_id', 'diagnosis_date', 'status']

    @classmethod
    def _validate_namespace_data(cls, data):
        errors = []
        if 'status' in data and not data['status']:
            errors.append("El estado no puede estar vacío")
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError
            raise ValidationError('; '.join(errors), code="validation_error")

    @classmethod
    def create(cls, commit=True, **kwargs):
        record = super().create(commit=commit, **kwargs)
        if record and record.finca_id:
            try:
                from app.services.push_notification_service import PushNotificationService
                animal_code = record.animal.record if record and record.animal else f"Animal #{kwargs.get('animal_id')}"
                disease_name = record.disease.name if record and record.disease else "Enfermedad"
                PushNotificationService.send_to_finca(
                    finca_id=record.finca_id,
                    title=f"🏥 Nuevo Diagnóstico: {animal_code}",
                    body=f"Se ha diagnosticado {disease_name}. Revisa la ficha médica.",
                    roles=['Veterinario', 'Instructor', 'Propietario', 'Administrador', 'Capataz'],
                    data={'type': 'disease', 'animal_id': record.animal_id, 'url': '/admin/disease-animals'}
                )
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Error enviando notificacion sanitaria: {e}")
        return record

    def __repr__(self):
        return f'<AnimalDisease {self.id}: Animal {self.animal_id} - Disease {self.disease_id}>'
