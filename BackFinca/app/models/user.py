from app import db
from werkzeug.security import generate_password_hash, check_password_hash
try:
    import bcrypt
except Exception:
    bcrypt = None
from app.models.base_model import BaseModel, ValidationError
import enum

class Role(enum.Enum):
    Aprendiz = 'Aprendiz'
    Instructor = 'Instructor'
    Administrador = 'Administrador'
    Propietario = 'Propietario'
    Capataz = 'Capataz'
    Operario = 'Operario'
    Veterinario = 'Veterinario'

class ApprovalStatus(enum.Enum):
    Pending = 'Pending'
    Approved = 'Approved'
    Rejected = 'Rejected'
    Suspended = 'Suspended'

    @classmethod
    def get_choices(cls):
        return [(c.value, c.value) for c in cls]

    @classmethod
    def get_choices(cls):
        return [(c.value, c.value) for c in cls]

    def __str__(self):
        return str(self.value)

    def __repr__(self):
        return f"{self.__class__.__name__}.{self.name}"

ROLE_FINCA_TYPE_MAP = {
    'Educativa': {'Aprendiz', 'Instructor', 'Administrador'},
    'Tradicional': {'Propietario', 'Capataz', 'Operario', 'Veterinario'},
}

ROLE_DEFAULTS = {
    'Educativa': 'Administrador',
    'Tradicional': 'Propietario',
}

def is_role_valid_for_finca(role_value: str, finca_type: str) -> bool:
    valid_roles = ROLE_FINCA_TYPE_MAP.get(finca_type, set())
    return role_value in valid_roles

def get_default_role_for_finca(finca_type: str) -> str:
    return ROLE_DEFAULTS.get(finca_type, 'Operario')

class User(BaseModel):
    __tablename__ = 'user'
    __table_args__ = (
        db.Index('ix_user_updated_at', 'updated_at'),
        db.Index('ix_user_created_at', 'created_at'),
        db.Index('ix_user_finca_id', 'finca_id'),
        db.Index('ix_user_role', 'role'),
    )

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    identification = db.Column(db.BigInteger, unique=True, nullable=False)
    fullname = db.Column(db.String(120), nullable=False)
    password = db.Column(db.String(255), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    phone = db.Column(db.String(40), unique=True, nullable=False)
    address = db.Column(db.String(255), nullable=True)
    role = db.Column(db.Enum(Role), nullable=False)
    status = db.Column(db.Boolean, default=True)
    approval_status = db.Column(db.Enum(ApprovalStatus), default=ApprovalStatus.Pending, nullable=False)
    finca_id = db.Column(db.Integer, db.ForeignKey('finca.id'), nullable=True)
    avatar_url = db.Column(db.String(255), nullable=True)

    # Campos de Verificación de Tarjeta Profesional (Veterinarios)
    professional_card = db.Column(db.String(50), nullable=True)
    professional_specialty = db.Column(db.String(100), nullable=True)
    is_verified_professional = db.Column(db.Boolean, default=False, nullable=False)
    verification_document_url = db.Column(db.String(255), nullable=True)
    verification_date = db.Column(db.DateTime, nullable=True)

    # Campos de Cumplimiento de Tratamiento de Datos (Habeas Data Ley 1581 / GDPR)
    habeas_data_accepted = db.Column(db.Boolean, default=False, nullable=False)
    habeas_data_accepted_at = db.Column(db.DateTime, nullable=True)
    terms_accepted = db.Column(db.Boolean, default=False, nullable=False)
    terms_accepted_at = db.Column(db.DateTime, nullable=True)

    finca = db.relationship('Finca', backref='users', lazy='selectin')

    _namespace_fields = [
        'id', 'identification', 'fullname', 'email', 'phone', 'address', 'role', 'status', 'approval_status',
        'finca_id', 'avatar_url', 'created_at', 'updated_at', 'fincas', 'is_multi_finca', 'finca_name', 'finca_type',
        'professional_card', 'professional_specialty', 'is_verified_professional', 'verification_document_url', 'verification_date',
        'habeas_data_accepted', 'habeas_data_accepted_at', 'terms_accepted', 'terms_accepted_at'
    ]
    _namespace_relations = {
        'diseases': {'fields': ['id', 'animal_id', 'disease_id', 'diagnosis_date'], 'depth': 1},
        'vaccines_as_apprentice': {'fields': ['id', 'animal_id', 'vaccine_id', 'vaccination_date'], 'depth': 1},
        'vaccines_as_instructor': {'fields': ['id', 'animal_id', 'vaccine_id', 'vaccination_date'], 'depth': 1}
    }
    _searchable_fields = ['fullname', 'email', 'professional_card']
    _filterable_fields = ['role', 'status', 'approval_status', 'is_verified_professional', 'created_at']
    _sortable_fields = ['id', 'fullname', 'email', 'identification', 'created_at', 'updated_at']
    _required_fields = ['identification', 'fullname', 'password', 'email', 'phone', 'role']
    _unique_fields = ['identification', 'email', 'phone']
    _enum_fields = {'role': Role, 'approval_status': ApprovalStatus}

    _cache_config = {
        'ttl': 60,
        'type': 'private',
        'strategy': 'network-first',
        'max_age': 60,
        'stale_while_revalidate': 30,
    }

    diseases = db.relationship('AnimalDiseases', back_populates='instructor', lazy='dynamic')
    vaccines_as_apprentice = db.relationship('Vaccinations', foreign_keys='Vaccinations.apprentice_id', back_populates='apprentice', lazy='dynamic')
    vaccines_as_instructor = db.relationship('Vaccinations', foreign_keys='Vaccinations.instructor_id', back_populates='instructor', lazy='dynamic')

    @classmethod
    def _validate_and_normalize(cls, data, is_update=False, instance_id=None):
        sanitized = dict(data or {})
        errors = []

        for field in ['fullname', 'email', 'phone', 'address', 'password']:
            if field in sanitized and isinstance(sanitized[field], str):
                sanitized[field] = sanitized[field].strip()
        if 'email' in sanitized and isinstance(sanitized['email'], str):
            sanitized['email'] = sanitized['email'].lower()

        if 'identification' in sanitized:
            try:
                sanitized['identification'] = int(str(sanitized['identification']).strip())
            except (TypeError, ValueError, AttributeError):
                errors.append("El campo 'identification' debe ser numérico")

        password = sanitized.get('password')
        if password is not None:
            if isinstance(password, str):
                password = password.strip()
                sanitized['password'] = password
            if password:
                if len(password) < 8:
                    errors.append("El campo 'password' debe tener al menos 8 caracteres")
            elif not is_update:
                errors.append("El campo 'password' es requerido")
        elif not is_update:
            errors.append("El campo 'password' es requerido")

        email_value = sanitized.get('email')
        if email_value:
            if not isinstance(email_value, str) or '@' not in email_value or email_value.count('@') != 1:
                errors.append("El campo 'email' debe ser un correo válido")

        if errors:
            raise ValidationError('; '.join(errors), errors=errors)

        return super()._validate_and_normalize(sanitized, is_update=is_update, instance_id=instance_id)

    def set_password(self, password: str) -> None:
        self.password = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        if not self.password or password is None:
            return False
        try:
            if check_password_hash(self.password, password):
                return True
        except Exception:
            pass

        if not bcrypt:
            return False
        try:
            stored_hash = self.password.encode('utf-8')
            if stored_hash.startswith(b'$2y$'):
                stored_hash = b'$2b$' + stored_hash[4:]
            if stored_hash.startswith((b'$2a$', b'$2b$')):
                return bcrypt.checkpw(password.encode('utf-8'), stored_hash)
        except Exception:
            return False
        return False

    @classmethod
    def create(cls, commit=True, **kwargs):
        if 'password' in kwargs:
            kwargs['password'] = generate_password_hash(kwargs['password'])

        # Call super().create with commit=False to avoid premature commit
        user = super().create(commit=False, **kwargs)

        # Sincronizar con UserFinca
        if user and user.finca_id:
            from app.models.user_finca import UserFinca
            UserFinca.assign(
                user_id=user.id,
                finca_id=user.finca_id,
                role=getattr(user.role, 'value', str(user.role)),
                is_active=True,
                is_primary=True,
                commit=False
            )

        if commit:
            db.session.commit()
            try:
                db.session.refresh(user)
            except Exception:
                pass
        return user

    def update(self, commit=True, **kwargs):
        if 'password' in kwargs:
            kwargs['password'] = generate_password_hash(kwargs['password'])

        updated_user = super().update(commit=False, **kwargs)

        # Sincronizar con UserFinca si cambió finca_id o role
        if 'finca_id' in kwargs or 'role' in kwargs:
            from app.models.user_finca import UserFinca
            UserFinca.assign(
                user_id=self.id,
                finca_id=self.finca_id,
                role=getattr(self.role, 'value', str(self.role)),
                is_active=True,
                is_primary=True,
                commit=False
            )

        if commit:
            db.session.commit()
            try:
                db.session.refresh(self)
            except Exception:
                pass
        return updated_user

    def to_namespace_dict(self, include_relations=False, depth=1, fields=None):
        data = super().to_namespace_dict(include_relations, depth, fields)
        data.pop('password', None)
        return data

    @property
    def fincas(self):
        from app.models.user_finca import UserFinca
        return UserFinca.get_user_fincas(self.id)

    @property
    def is_multi_finca(self):
        from app.models.user_finca import UserFinca
        return UserFinca.is_multi_finca(self.id)

    @property
    def finca_name(self):
        return self.finca.name if self.finca else None

    @property
    def finca_type(self):
        return getattr(self.finca.type, 'value', str(self.finca.type)) if self.finca and self.finca.type else None

    def __repr__(self):
        return f'<User {self.id}: {self.fullname}>'
