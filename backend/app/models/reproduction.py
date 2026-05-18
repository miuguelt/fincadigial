import enum as _enum
from datetime import date, timedelta
from app import db
from app.models.base_model import BaseModel
from app.models.animals import Sex
from sqlalchemy import Index

CATTLE_GESTATION_DAYS = 283


class EventType(_enum.Enum):
    Celo = "Celo"
    Inseminacion = "Inseminacion"
    Diagnostico = "Diagnostico"
    Parto = "Parto"


class InseminationTechnique(_enum.Enum):
    Natural = "Natural"
    Artificial = "Artificial"
    Transferencia_Embrionaria = "Transferencia_Embrionaria"


class DiagnosisResult(_enum.Enum):
    Positivo = "Positivo"
    Negativo = "Negativo"
    Pendiente = "Pendiente"


class ReproductiveEvent(BaseModel):
    __tablename__ = 'reproductive_events'
    __table_args__ = (
        Index('ix_repr_events_animal_id', 'animal_id'),
        Index('ix_repr_events_event_date', 'event_date'),
        Index('ix_repr_events_event_type', 'event_type'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=False)
    event_type = db.Column(db.Enum(EventType), nullable=False)
    event_date = db.Column(db.Date, nullable=False)

    # Inseminación
    sire_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=True)
    technique = db.Column(db.Enum(InseminationTechnique), nullable=True)

    # Diagnóstico de preñez
    diagnosis_result = db.Column(db.Enum(DiagnosisResult), nullable=True)
    expected_birth_date = db.Column(db.Date, nullable=True)

    # Parto
    alive_count = db.Column(db.Integer, nullable=True)
    dead_count = db.Column(db.Integer, nullable=True)
    complications = db.Column(db.Boolean, nullable=True, default=False)

    actor_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    notes    = db.Column(db.String(500), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)

    animal   = db.relationship('Animals', foreign_keys=[animal_id], lazy='selectin')
    sire     = db.relationship('Animals', foreign_keys=[sire_id], lazy='selectin')
    actor    = db.relationship('User', foreign_keys=[actor_id], lazy='selectin')
    offspring = db.relationship('Offspring', back_populates='birth_event',
                                lazy='dynamic', cascade='all, delete-orphan')

    _namespace_fields = [
        'id', 'animal_id', 'event_type', 'event_date',
        'sire_id', 'technique', 'diagnosis_result', 'expected_birth_date',
        'alive_count', 'dead_count', 'complications',
        'actor_id', 'notes', 'finca_id', 'created_at', 'updated_at',
    ]
    _namespace_relations = {
        'animal': {'fields': ['id', 'record', 'sex']},
        'sire': {'fields': ['id', 'record']},
        'actor': {'fields': ['id', 'fullname']},
    }
    _searchable_fields = ['notes']
    _filterable_fields = ['animal_id', 'event_type', 'event_date', 'diagnosis_result', 'sire_id', 'finca_id']
    _sortable_fields = ['id', 'event_date', 'event_type', 'created_at']
    _required_fields = ['animal_id', 'event_type', 'event_date']
    _unique_fields = []
    _enum_fields = {
        'event_type': EventType,
        'technique': InseminationTechnique,
        'diagnosis_result': DiagnosisResult,
    }

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        data = super().to_namespace_dict(include_relations=include_relations, depth=depth, fields=fields)
        data['days_to_birth'] = self.days_to_birth
        data['is_overdue'] = self.is_overdue
        return data

    @property
    def days_to_birth(self):
        if self.expected_birth_date and self.event_type == EventType.Inseminacion:
            return (self.expected_birth_date - date.today()).days
        return None

    @property
    def is_overdue(self):
        d = self.days_to_birth
        return d is not None and d < 0

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        from datetime import date as _date
        from app.models.base_model import ValidationError

        d = dict(data or {})

        # Date normalization is now handled by BaseModel (0.2 in its _validate_and_normalize)
        # We must call it EARLY if we want to use the date objects in our custom logic below
        # Or we can just rely on the fact that super()._validate_and_normalize will be called at the end.
        # But we need date objects for timedelta addition.
        
        # Let's ensure dates are normalized for our logic
        if 'event_date' in d and isinstance(d['event_date'], str):
             try:
                 d['event_date'] = _date.fromisoformat(d['event_date'])
             except (ValueError, TypeError):
                 pass

        # Auto-compute expected_birth_date for inseminations
        if d.get('event_type') in ('Inseminacion', EventType.Inseminacion):
            if 'expected_birth_date' not in d or not d['expected_birth_date']:
                if d.get('event_date'):
                    ev_date = d['event_date']
                    if isinstance(ev_date, _date):
                        d['expected_birth_date'] = ev_date + timedelta(days=CATTLE_GESTATION_DAYS)

        return super()._validate_and_normalize(d, is_update, instance_id)


class Offspring(BaseModel):
    __tablename__ = 'offspring'
    __table_args__ = (
        Index('ix_offspring_birth_event_id', 'birth_event_id'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    birth_event_id = db.Column(db.Integer, db.ForeignKey('reproductive_events.id'), nullable=False)
    animal_id = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=True)
    sex = db.Column(db.Enum(Sex), nullable=True)
    alive = db.Column(db.Boolean, nullable=False, default=True)
    birth_weight = db.Column(db.Integer, nullable=True)
    notes = db.Column(db.String(255), nullable=True)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)

    birth_event = db.relationship('ReproductiveEvent', back_populates='offspring', lazy='selectin')
    animal = db.relationship('Animals', foreign_keys=[animal_id], lazy='selectin')

    _namespace_fields = [
        'id', 'birth_event_id', 'animal_id', 'sex', 'alive', 'birth_weight', 'notes', 'finca_id', 'created_at',
    ]
    _namespace_relations = {
        'animal': {'fields': ['id', 'record']},
    }
    _filterable_fields = ['birth_event_id', 'alive', 'animal_id', 'finca_id']
    _sortable_fields = ['id', 'created_at']
    _required_fields = ['birth_event_id']
    _unique_fields = []
    _enum_fields = {'sex': Sex}

