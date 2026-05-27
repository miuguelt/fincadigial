import pytest
import os
import sys

# Asegurar que el directorio raíz del backend esté en el path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import create_app, db as _db


# ---------------------------------------------------------------------------
# App — scope=session para no recrear la app en cada test
# ---------------------------------------------------------------------------

@pytest.fixture(scope='session')
def app():
    """Crea la aplicación Flask en modo testing (SQLite :memory:).
    
    scope=session: la app y la configuración se crean una sola vez por sesión.
    La BD se reinicia por cada test mediante el fixture db_session.
    """
    _app = create_app('testing')
    # Contexto de aplicación activo para toda la sesión; los fixtures
    # de función crean sub-contextos con app.app_context() cuando lo necesiten.
    return _app


# ---------------------------------------------------------------------------
# Cliente HTTP — scope=function para evitar cookies/estado entre tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope='function')
def client(app):
    """Cliente de prueba HTTP aislado por función."""
    return app.test_client()


# ---------------------------------------------------------------------------
# BD — se crea y destruye por cada test para garantizar aislamiento total
# ---------------------------------------------------------------------------

@pytest.fixture(scope='function', autouse=True)
def db_session(app):
    """Fixture que reinicia la base de datos para cada test.
    
    IMPORTANTE: Toda interacción con la BD DEBE ocurrir dentro del
    app_context() que este fixture provee. Los fixtures que crean datos
    (test_user, token_for, etc.) deben declarar db_session como dependencia
    para garantizar que corren en el mismo contexto.
    """
    with app.app_context():
        _db.create_all()
        yield _db
        _db.session.remove()
        _db.drop_all()


# ---------------------------------------------------------------------------
# Helpers internos — solo para uso dentro de fixtures
# ---------------------------------------------------------------------------

def _get_or_create_finca(finca_type_enum):
    """Obtiene o crea una Finca del tipo indicado. DEBE llamarse dentro de app_context."""
    from app.models import Finca
    finca = Finca.query.filter_by(type=finca_type_enum).first()
    if not finca:
        finca = Finca.create(
            name=f'Finca {finca_type_enum.value} Test',
            type=finca_type_enum,
            is_active=True
        )
        _db.session.commit()
    return finca


def _create_user(identification, fullname, email, phone, password, role, finca_id,
                 approval_status, status=True):
    """Crea un usuario en la BD. DEBE llamarse dentro de app_context."""
    from app.models.user import User
    user = User.query.filter_by(email=email).first()
    if not user:
        user = User.create(
            identification=identification,
            fullname=fullname,
            email=email,
            phone=phone,
            password=password,
            role=role,
            finca_id=finca_id,
            approval_status=approval_status,
            status=status
        )
        _db.session.commit()
    return user


def _make_jwt(app, user, finca):
    """Genera un JWT válido para el usuario dado. DEBE llamarse dentro de app_context."""
    from flask_jwt_extended import create_access_token
    token = create_access_token(
        identity=str(user.id),
        additional_claims={
            'id': user.id,
            'identification': user.identification,
            'role': user.role.value,
            'fullname': user.fullname,
            'finca_id': user.finca_id,
            'finca_type': finca.type.value,
        }
    )
    return {'Authorization': f'Bearer {token}'}


# ---------------------------------------------------------------------------
# Fixture: auth_headers — admin por defecto
# ---------------------------------------------------------------------------

@pytest.fixture(scope='function')
def auth_headers(app, db_session):
    """Headers con JWT para un usuario Administrador de prueba.
    
    Depende explícitamente de db_session para garantizar que corre dentro
    del mismo app_context() donde la BD fue creada.
    """
    from app.models.user import Role, ApprovalStatus
    from app.models import FarmType

    with app.app_context():
        finca = _get_or_create_finca(FarmType.Tradicional)
        user = _create_user(
            identification=123456789,
            fullname='Administrador Test',
            email='admin@villaluz.com',
            phone='3001234567',
            password='TestPassword123!',
            role=Role.Administrador,
            finca_id=finca.id,
            approval_status=ApprovalStatus.Approved,
        )
        return _make_jwt(app, user, finca)


# ---------------------------------------------------------------------------
# Fixture: token_for — genera tokens por rol/tipo de finca
# ---------------------------------------------------------------------------

@pytest.fixture(scope='function')
def token_for(app, db_session):
    """Retorna una función para generar tokens JWT por rol y tipo de finca.
    
    Uso:
        headers = token_for('Administrador')
        headers = token_for('Operario', finca_type='Campesina')
    """
    import random
    from app.models.user import Role, ApprovalStatus
    from app.models import FarmType

    def _token_for(role_name: str, finca_type: str = 'Tradicional'):
        with app.app_context():
            # Resolver Enum de rol
            role = next((r for r in Role if r.value == role_name), Role.Operario)

            # Resolver Enum de tipo de finca
            f_type = next((t for t in FarmType if t.value == finca_type), FarmType.Tradicional)

            finca = _get_or_create_finca(f_type)

            rand_id = random.randint(100_000, 999_999)
            email = f'user_{role.value.lower()}_{rand_id}@test.villaluz'

            user = _create_user(
                identification=rand_id,
                fullname=f'Usuario {role.value}',
                email=email,
                phone=f'300{rand_id:06d}',
                password='TestPassword123!',
                role=role,
                finca_id=finca.id,
                approval_status=ApprovalStatus.Approved,
                status=True,
            )
            return _make_jwt(app, user, finca)

    return _token_for


# ---------------------------------------------------------------------------
# Fixtures de usuarios específicos
# ---------------------------------------------------------------------------

@pytest.fixture(scope='function')
def test_user(app, db_session):
    """Usuario Administrador activo y aprobado."""
    from app.models.user import Role, ApprovalStatus
    from app.models import FarmType

    with app.app_context():
        finca = _get_or_create_finca(FarmType.Tradicional)
        user = _create_user(
            identification=888999111,
            fullname='Usuario Test',
            email='pytest@test.villaluz',
            phone='3009998881',
            password='TestPassword123!',
            role=Role.Administrador,
            finca_id=finca.id,
            approval_status=ApprovalStatus.Approved,
            status=True,
        )
        return {
            'id': user.id,
            'identification': user.identification,
            'email': user.email,
            'password': 'TestPassword123!',
        }


@pytest.fixture(scope='function')
def inactive_user(app, db_session):
    """Usuario Operario inactivo (status=False)."""
    from app.models.user import Role, ApprovalStatus
    from app.models import FarmType

    with app.app_context():
        finca = _get_or_create_finca(FarmType.Tradicional)
        user = _create_user(
            identification=777666555,
            fullname='Usuario Inactivo',
            email='inactive@test.villaluz',
            phone='3007776665',
            password='TestPassword123!',
            role=Role.Operario,
            finca_id=finca.id,
            approval_status=ApprovalStatus.Approved,
            status=False,
        )
        return {
            'id': user.id,
            'identification': user.identification,
            'email': user.email,
            'password': 'TestPassword123!',
        }


@pytest.fixture(scope='function')
def pending_user(app, db_session):
    """Usuario Operario pendiente de aprobación."""
    from app.models.user import Role, ApprovalStatus
    from app.models import FarmType

    with app.app_context():
        finca = _get_or_create_finca(FarmType.Tradicional)
        user = _create_user(
            identification=555444333,
            fullname='Usuario Pendiente',
            email='pending@test.villaluz',
            phone='3005554443',
            password='TestPassword123!',
            role=Role.Operario,
            finca_id=finca.id,
            approval_status=ApprovalStatus.Pending,
            status=True,
        )
        return {
            'id': user.id,
            'identification': user.identification,
            'email': user.email,
            'password': 'TestPassword123!',
        }
