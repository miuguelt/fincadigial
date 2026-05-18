from app import db
import enum
from datetime import datetime, timezone
from app.models.base_model import BaseModel

class TaskStatus(enum.Enum):
    PENDING = 'Pendiente'
    IN_PROGRESS = 'En Progreso'
    COMPLETED = 'Completada'
    CANCELLED = 'Cancelada'

class TaskPriority(enum.Enum):
    LOW = 'Baja'
    MEDIUM = 'Media'
    HIGH = 'Alta'
    URGENT = 'Urgente'

class Tasks(BaseModel):
    """Modelo para la agenda de tareas operativas de la finca."""
    __tablename__ = 'tasks'
    __table_args__ = (
        db.Index('ix_tasks_due_date', 'due_date'),
        db.Index('ix_tasks_finca_status', 'finca_id', 'status'),
    )

    id           = db.Column(db.Integer, primary_key=True)
    title        = db.Column(db.String(150), nullable=False)
    description  = db.Column(db.Text, nullable=True)
    status       = db.Column(db.Enum(TaskStatus), default=TaskStatus.PENDING)
    priority     = db.Column(db.Enum(TaskPriority), default=TaskPriority.MEDIUM)
    due_date     = db.Column(db.DateTime, nullable=True)
    
    # Vínculos opcionales
    animal_id    = db.Column(db.Integer, db.ForeignKey('animals.id'), nullable=True)
    field_id     = db.Column(db.Integer, db.ForeignKey('fields.id'), nullable=True)
    assigned_to  = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    finca_id     = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=False)

    # Relaciones
    animal   = db.relationship('Animals', backref=db.backref('tasks', lazy='dynamic'))
    field    = db.relationship('Fields', backref=db.backref('tasks', lazy='dynamic'))
    assignee = db.relationship('User', foreign_keys=[assigned_to], backref=db.backref('assigned_tasks', lazy='dynamic'))

    _namespace_fields = [
        'id', 'title', 'description', 'status', 'priority', 'due_date', 
        'animal_id', 'field_id', 'assigned_to', 'finca_id', 'created_at'
    ]
    _enum_fields = {'status': TaskStatus, 'priority': TaskPriority}

    @classmethod
    def _validate_namespace_data(cls, data):
        """Validación de seguridad para asegurar consistencia multi-tenant"""
        from app.models.user import User
        errors = []
        
        if 'assigned_to' in data and data['assigned_to']:
            user = User.query.get(data['assigned_to'])
            finca_id = data.get('finca_id')
            if user and user.finca_id != finca_id:
                errors.append("No se puede asignar una tarea a un usuario de otra finca.")
        
        super()._validate_namespace_data(data)
        if errors:
            from app.models.base_model import ValidationError
            raise ValidationError('; '.join(errors), code="security_violation")
