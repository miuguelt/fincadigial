import importlib.util
from pathlib import Path

from app import db
from app.models import FarmType, Finca
from app.models.user import ApprovalStatus, Role, User


_SCRIPT_PATH = (
    Path(__file__).resolve().parents[2] / "scripts" / "cleanup_simulated_data.py"
)
_SPEC = importlib.util.spec_from_file_location("cleanup_simulated_data", _SCRIPT_PATH)
cleanup_simulated_data = importlib.util.module_from_spec(_SPEC)
assert _SPEC and _SPEC.loader
_SPEC.loader.exec_module(cleanup_simulated_data)


def test_cleanup_preserves_canonical_quick_start_users(app, db_session):
    with app.app_context():
        finca = Finca.create(name="Finca cleanup test", type=FarmType.Tradicional)
        protected = User.create(
            identification=1098,
            fullname="Admin VillaLuz",
            email="test_admin@villaluz.com",
            phone="3000001098",
            password="test-password",
            role=Role.Administrador,
            finca_id=finca.id,
            status=True,
            approval_status=ApprovalStatus.Approved,
        )
        removable = User.create(
            identification=90000001,
            fullname="UsuarioFinal Legacy",
            email="usuario-legacy@villaluz.test",
            phone="3009000001",
            password="test-password",
            role=Role.Operario,
            finca_id=finca.id,
            status=True,
            approval_status=ApprovalStatus.Approved,
        )
        db.session.commit()

        targets = User.query.filter(
            cleanup_simulated_data.known_test_accounts_predicate()
        ).all()

        assert protected not in targets
        assert removable in targets
