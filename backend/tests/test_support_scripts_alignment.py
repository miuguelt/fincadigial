"""Los scripts de apoyo crean usuarios que el seeder de arranque respeta.

Ejercita la función real de `scripts/create_test_users.py` contra la BD de
pruebas y luego corre el seeder, que es quien borra a los usuarios que ocupan un
documento o correo objetivo con datos distintos.
"""

import os
import sys

import pytest

from app.models.finca import FarmType, Finca
from app.models.user import Role, User
from app.utils.seed_identities import get_seed_identity
from app.utils.seed_users import ensure_test_users


SCRIPTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "scripts")
)
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from create_test_users import FIELD_ROLES, ensure_user  # noqa: E402


@pytest.fixture
def script_env(monkeypatch):
    """Contraseñas E2E mínimas para que los scripts puedan correr."""
    for suffix in ("WORKER", "VET"):
        monkeypatch.setenv(f"VILLALUZ_E2E_{suffix}_PASSWORD", "Clave-De-Prueba-1")
    monkeypatch.setenv("ADMIN_PASSWORD", "Clave-De-Prueba-1")
    return monkeypatch


@pytest.fixture
def finca(db_session):
    finca = Finca(name="Finca de Prueba", type=FarmType.Tradicional, department="Antioquia")
    db_session.session.add(finca)
    db_session.session.commit()
    return finca


def test_script_creates_field_users_with_canonical_identities(script_env, finca):
    for role in FIELD_ROLES:
        user = ensure_user(role, finca.id)
        profile = get_seed_identity(role)

        assert user.identification == profile["identification"]
        assert user.email == profile["email"]
        assert user.role == Role[role]


def test_script_is_idempotent(script_env, finca):
    first = ensure_user("Operario", finca.id)
    again = ensure_user("Operario", finca.id)

    assert again.id == first.id
    assert User.query.count() == 1


def test_seeder_deletes_a_user_squatting_a_foreign_document(script_env, finca):
    """Documenta el mecanismo que rompía a los scripts: documento de otro rol."""
    propietario = get_seed_identity("Propietario")
    intruder_email = "operario@villaluz.com"
    User.create(
        identification=propietario["identification"],
        fullname="Operario con documento ajeno",
        email=intruder_email,
        phone="3005555555",
        role="Operario",
        password=os.environ["VILLALUZ_E2E_WORKER_PASSWORD"],
        finca_id=finca.id,
        status=True,
        commit=True,
    )

    ensure_test_users()

    assert User.query.filter_by(email=intruder_email).first() is None
    survivor = User.query.filter_by(
        identification=propietario["identification"]
    ).first()
    assert survivor.email == propietario["email"]
    assert survivor.role == Role.Propietario


def test_seeder_does_not_delete_users_created_by_the_script(script_env, finca):
    created = {role: ensure_user(role, finca.id).id for role in FIELD_ROLES}

    ensure_test_users()

    for role, previous_pk in created.items():
        profile = get_seed_identity(role)
        survivor = User.query.filter_by(identification=profile["identification"]).first()
        assert survivor is not None, f"El seeder borró al {role} creado por el script"
        assert survivor.id == previous_pk
        assert survivor.role == Role[role]
