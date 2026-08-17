"""Contrato del cargador de credenciales que usan los scripts de `scripts/`.

Los scripts toman el documento de la tabla canónica de identidades, así que
necesitan pedir solo la contraseña. Exigir además la variable del documento
bloqueaba la ejecución sin ninguna ganancia de seguridad.
"""

import os
import sys

import pytest


SCRIPTS_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "scripts")
)
if SCRIPTS_DIR not in sys.path:
    sys.path.insert(0, SCRIPTS_DIR)

from test_credentials import (  # noqa: E402
    get_role_credentials,
    get_role_password,
)


PASSWORD_VARS = ("VILLALUZ_E2E_WORKER_PASSWORD", "E2E_WORKER_PASS")
ID_VARS = ("VILLALUZ_E2E_WORKER_ID", "E2E_WORKER_ID")


@pytest.fixture
def clean_env(monkeypatch):
    for variable in PASSWORD_VARS + ID_VARS:
        monkeypatch.delenv(variable, raising=False)
    return monkeypatch


def test_password_comes_from_the_preferred_variable(clean_env):
    clean_env.setenv("VILLALUZ_E2E_WORKER_PASSWORD", "clave-preferida")

    assert get_role_password("Operario") == "clave-preferida"


def test_password_falls_back_to_the_legacy_variable(clean_env):
    clean_env.setenv("E2E_WORKER_PASS", "clave-heredada")

    assert get_role_password("Operario") == "clave-heredada"


def test_missing_password_names_the_variable_to_define(clean_env):
    with pytest.raises(RuntimeError, match="VILLALUZ_E2E_WORKER_PASSWORD"):
        get_role_password("Operario")


def test_password_does_not_require_the_identification_variable(clean_env):
    """Regresión: los scripts fallaban por una variable de documento que ya no usan."""
    clean_env.setenv("VILLALUZ_E2E_WORKER_PASSWORD", "clave-preferida")

    assert get_role_password("Operario") == "clave-preferida"


def test_unknown_role_fails_loudly(clean_env):
    with pytest.raises(ValueError):
        get_role_password("Jardinero")


def test_full_credentials_still_require_both_variables(clean_env):
    clean_env.setenv("VILLALUZ_E2E_WORKER_PASSWORD", "clave-preferida")

    with pytest.raises(RuntimeError):
        get_role_credentials("Operario")

    clean_env.setenv("VILLALUZ_E2E_WORKER_ID", "33333333")
    assert get_role_credentials("Operario") == ("33333333", "clave-preferida")
