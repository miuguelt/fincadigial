import pytest
import os
import sys

# Asegurar que el directorio raíz del backend esté en el path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db

@pytest.fixture(scope='session')
def app():
    """Fixture que crea la aplicación Flask en modo testing."""
    _app = create_app('testing')
    return _app

@pytest.fixture(scope='session')
def client(app):
    """Fixture que proporciona un cliente de prueba para la API."""
    return app.test_client()

@pytest.fixture(scope='function', autouse=True)
def db_session(app):
    """Fixture que reinicia la base de datos para cada test."""
    with app.app_context():
        db.create_all()
        yield db
        db.session.remove()
        db.drop_all()

@pytest.fixture
def auth_headers(client):
    """Fixture para obtener headers con token JWT."""
    from app.models.user import User, Role, ApprovalStatus
    from app.models import Finca, FarmType
    from flask_jwt_extended import create_access_token
    
    # Check if Finca exists, otherwise create
    finca = Finca.query.first()
    if not finca:
        finca = Finca.create(name='Finca Test', type=FarmType.Tradicional)
        db.session.commit()
        
    # Check if User exists, otherwise create
    user = User.query.filter_by(email='admin@villaluz.com').first()
    if not user:
        user = User.create(
            identification=123456789,
            fullname='Administrador Test',
            email='admin@villaluz.com',
            phone='3001234567',
            password='testpassword',
            role=Role.Administrador,
            finca_id=finca.id,
            approval_status=ApprovalStatus.Approved
        )
        db.session.commit()
        
    # Fallback to direct token generation which is always robust and works in SQLite :memory: environments
    token = create_access_token(identity=str(user.id), additional_claims={
        'id': user.id,
        'identification': user.identification,
        'role': user.role.value,
        'fullname': user.fullname,
        'finca_id': user.finca_id,
        'finca_type': finca.type.value
    })
    return {'Authorization': f'Bearer {token}'}

@pytest.fixture
def token_for():
    """Fixture que retorna una función para generar tokens JWT según el rol y tipo de finca."""
    from app.models.user import User, Role, ApprovalStatus
    from app.models import Finca, FarmType
    from flask_jwt_extended import create_access_token
    import random

    def _token_for(role_name, finca_type="Tradicional"):
        # Map string role to Enum if needed
        if isinstance(role_name, str):
            role = next((r for r in Role if r.value == role_name), Role.Operario)
        else:
            role = role_name

        # Map string finca type to Enum
        if isinstance(finca_type, str):
            f_type = next((t for t in FarmType if t.value == finca_type), FarmType.Tradicional)
        else:
            f_type = finca_type

        # Create or find a Finca of the required type
        finca = Finca.query.filter_by(type=f_type).first()
        if not finca:
            finca = Finca.create(
                name=f"Finca {f_type.value} Test",
                type=f_type,
                is_active=True
            )
            db.session.commit()

        # Create a unique email and identification
        rand_id = random.randint(100000, 999999)
        email = f"user_{role.value.lower()}_{rand_id}@test.com"
        
        user = User.create(
            identification=rand_id,
            fullname=f"Usuario {role.value}",
            email=email,
            phone=f"300{rand_id:06d}",
            password="TestPassword123!",
            role=role,
            status=True,
            finca_id=finca.id,
            approval_status=ApprovalStatus.Approved
        )
        db.session.commit()

        token = create_access_token(identity=str(user.id), additional_claims={
            'id': user.id,
            'identification': user.identification,
            'role': user.role.value,
            'fullname': user.fullname,
            'finca_id': user.finca_id,
            'finca_type': finca.type.value
        })
        return {'Authorization': f'Bearer {token}'}

    return _token_for

@pytest.fixture
def test_user(db_session):
    from app.models.user import User, Role, ApprovalStatus
    from app.models import Finca, FarmType
    finca = Finca.query.first()
    if not finca:
        finca = Finca.create(name='Finca Test User', type=FarmType.Tradicional)
        db.session.commit()
    user = User.query.filter_by(email='pytest@test.villaluz').first()
    if not user:
        user = User.create(
            identification=888999111,
            fullname='Usuario Test',
            email='pytest@test.villaluz',
            phone='3009998881',
            password='TestPassword123!',
            role=Role.Administrador,
            finca_id=finca.id,
            approval_status=ApprovalStatus.Approved,
            status=True
        )
        db.session.commit()
    return {
        'id': user.id,
        'identification': user.identification,
        'email': user.email,
        'password': 'TestPassword123!'
    }

@pytest.fixture
def inactive_user(db_session):
    from app.models.user import User, Role, ApprovalStatus
    from app.models import Finca, FarmType
    finca = Finca.query.first()
    if not finca:
        finca = Finca.create(name='Finca Inactive User', type=FarmType.Tradicional)
        db.session.commit()
    user = User.query.filter_by(email='inactive@test.villaluz').first()
    if not user:
        user = User.create(
            identification=777666555,
            fullname='Usuario Inactivo',
            email='inactive@test.villaluz',
            phone='3007776665',
            password='TestPassword123!',
            role=Role.Operario,
            finca_id=finca.id,
            approval_status=ApprovalStatus.Approved,
            status=False
        )
        db.session.commit()
    return {
        'id': user.id,
        'identification': user.identification,
        'email': user.email,
        'password': 'TestPassword123!'
    }

@pytest.fixture
def pending_user(db_session):
    from app.models.user import User, Role, ApprovalStatus
    from app.models import Finca, FarmType
    finca = Finca.query.first()
    if not finca:
        finca = Finca.create(name='Finca Pending User', type=FarmType.Tradicional)
        db.session.commit()
    user = User.query.filter_by(email='pending@test.villaluz').first()
    if not user:
        user = User.create(
            identification=555444333,
            fullname='Usuario Pendiente',
            email='pending@test.villaluz',
            phone='3005554443',
            password='TestPassword123!',
            role=Role.Operario,
            finca_id=finca.id,
            approval_status=ApprovalStatus.Pending,
            status=True
        )
        db.session.commit()
    return {
        'id': user.id,
        'identification': user.identification,
        'email': user.email,
        'password': 'TestPassword123!'
    }
