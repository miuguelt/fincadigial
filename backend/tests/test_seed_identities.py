"""Alineación de identidades de prueba entre el seeder y los scripts de apoyo.

El seeder de arranque (`ensure_test_users`) borra cualquier usuario que ocupe un
documento o un correo objetivo con datos distintos. Si un script de apoyo crea el
mismo rol con otro documento o dominio, el siguiente arranque lo elimina. Estas
pruebas fijan una sola tabla canónica de identidades para ambos lados.
"""

import pytest

from app.models.user import Role, User
from app.utils.seed_identities import (
    ID_ENV_VARS,
    get_seed_identities,
    get_seed_identity,
)
from app.utils.seed_users import ensure_test_users


EXPECTED_IDENTITIES = {
    "Administrador": (1098, "admin@villaluz.co"),
    "Propietario": (55555555, "propietario@villaluz.co"),
    "Capataz": (66666666, "capataz@villaluz.co"),
    "Instructor": (11111111, "instructor@sena.edu.co"),
    "Aprendiz": (22222222, "aprendiz@sena.edu.co"),
    "Operario": (33333333, "operario@villaluz.co"),
    "Veterinario": (44444444, "veterinario@villaluz.co"),
}


@pytest.fixture
def clean_env(monkeypatch):
    """Elimina cualquier override de identidad para probar los valores por defecto."""
    for variable in list(ID_ENV_VARS.values()) + ["ADMIN_EMAIL"]:
        monkeypatch.delenv(variable, raising=False)
    return monkeypatch


def test_default_identities_match_login_profiles(clean_env):
    resolved = {
        profile["role"]: (profile["identification"], profile["email"])
        for profile in get_seed_identities()
    }
    assert resolved == EXPECTED_IDENTITIES


def test_identifications_are_integers_and_unique(clean_env):
    identifications = [profile["identification"] for profile in get_seed_identities()]
    emails = [profile["email"] for profile in get_seed_identities()]

    assert all(isinstance(value, int) for value in identifications)
    assert len(set(identifications)) == len(identifications)
    assert len(set(emails)) == len(emails)


def test_every_role_exists_in_the_application_enum(clean_env):
    for profile in get_seed_identities():
        assert Role[profile["role"]].value == profile["role"]


def test_identification_can_be_overridden_by_environment(clean_env):
    clean_env.setenv(ID_ENV_VARS["Operario"], "99999999")

    assert get_seed_identity("Operario")["identification"] == 99999999


def test_non_numeric_identification_fails_loudly(clean_env):
    clean_env.setenv(ID_ENV_VARS["Operario"], "no-es-un-numero")

    with pytest.raises(ValueError):
        get_seed_identity("Operario")


def test_unknown_role_fails_loudly(clean_env):
    with pytest.raises(ValueError):
        get_seed_identity("Jardinero")


def test_seeder_creates_exactly_the_canonical_identities(clean_env, db_session):
    ensure_test_users()

    for profile in get_seed_identities():
        user = User.query.filter_by(identification=profile["identification"]).first()
        assert user is not None, f"Falta el usuario sembrado {profile['role']}"
        assert user.email == profile["email"]
        assert user.role == Role[profile["role"]]


def test_seeder_keeps_users_created_by_support_scripts(clean_env, db_session):
    """Regresión: los scripts usaban documentos de otro rol y el seeder los borraba."""
    worker = get_seed_identity("Operario")
    ensure_test_users()

    created = User.query.filter_by(identification=worker["identification"]).first()
    previous_pk = created.id
    previous_total = User.query.count()

    # Un segundo arranque no debe borrar ni recrear a nadie.
    ensure_test_users()

    survivor = User.query.filter_by(identification=worker["identification"]).first()
    assert survivor is not None
    assert survivor.id == previous_pk
    assert survivor.role == Role.Operario
    assert User.query.count() == previous_total
