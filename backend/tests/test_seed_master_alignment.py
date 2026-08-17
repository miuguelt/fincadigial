"""El seed maestro y el seeder de arranque describen a las mismas personas.

`seed_fincas_and_users` arma el ecosistema regional (dos fincas, perfiles de
productor). Traía su propio elenco de documentos y correos, así que chocaba con
la tabla canónica: `ensure_test_users` borraba a quien tuviera un correo objetivo
con otro documento.
"""

import secrets

import pytest

from app.models.user import Role, User
from app.utils.seed_identities import get_seed_identity
from app.utils.seed_master import build_master_user_profiles, seed_fincas_and_users
from app.utils.seed_users import ensure_test_users


@pytest.fixture
def seed_env(monkeypatch):
    """Contraseñas explícitas para que los seeds no generen una efímera."""
    generated = secrets.token_urlsafe(12)
    monkeypatch.setenv("ADMIN_PASSWORD", generated)
    monkeypatch.setenv("TEST_USER_PASSWORD", generated)
    return monkeypatch


def test_master_profiles_use_canonical_identities():
    for profile in build_master_user_profiles():
        canonical = get_seed_identity(profile["role"].value)

        assert profile["id"] == canonical["identification"]
        assert profile["email"] == canonical["email"]
        assert profile["name"] == canonical["fullname"]


def test_master_profiles_cover_every_role_once():
    roles = [profile["role"] for profile in build_master_user_profiles()]

    assert sorted(role.value for role in roles) == sorted(role.value for role in Role)


def test_startup_seeder_does_not_delete_master_users(seed_env, db_session):
    seed_fincas_and_users()
    seeded = {user.identification for user in User.query.all()}
    assert seeded, "El seed maestro no creó usuarios"

    ensure_test_users()

    survivors = {user.identification for user in User.query.all()}
    assert seeded <= survivors, f"El seeder borró {seeded - survivors}"


def test_master_seed_is_idempotent_after_the_startup_seeder(seed_env, db_session):
    seed_fincas_and_users()
    ensure_test_users()
    total = User.query.count()

    seed_fincas_and_users()

    assert User.query.count() == total
