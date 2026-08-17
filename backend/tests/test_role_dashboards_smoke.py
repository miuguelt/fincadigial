"""
Tests automatizados de verificación y smoke testing para todos los roles de usuario.
Valida que cada rol se autentica correctamente y obtiene el perfil esperado.
"""

import pytest
from app.models.user import Role, ApprovalStatus
from app.models import FarmType, Finca
from app.models.user import User
from tests.conftest import get_test_password

BASE = "/api/v1"


@pytest.fixture(scope="function")
def populated_roles(app, db_session):
    """Crea los 7 roles canónicos de prueba en la base de datos de test."""
    roles_data = [
        (1098, "Admin Test", Role.Administrador),
        (55555555, "Dueño Test", Role.Propietario),
        (66666666, "Capataz Test", Role.Capataz),
        (11111111, "Instructor Test", Role.Instructor),
        (22222222, "Aprendiz Test", Role.Aprendiz),
        (33333333, "Operario Test", Role.Operario),
        (44444444, "Veterinario Test", Role.Veterinario),
    ]
    created = []
    with app.app_context():
        from tests.conftest import _get_or_create_finca

        finca = _get_or_create_finca(FarmType.Tradicional)

        for ident, name, role in roles_data:
            user = User.query.filter_by(identification=ident).first()
            if not user:
                user = User.create(
                    identification=ident,
                    fullname=name,
                    email=f"{role.value.lower()}@test.villaluz",
                    phone=f"300{ident % 10000000:07d}",
                    password=get_test_password(),
                    role=role,
                    finca_id=finca.id,
                    approval_status=ApprovalStatus.Approved,
                    status=True,
                )
            created.append((ident, role))
    return created


def test_dev_users_endpoint_returns_available_roles(client, populated_roles):
    """El endpoint /auth/dev-users debe retornar la lista de usuarios de prueba."""
    resp = client.get(f"{BASE}/auth/dev-users")
    assert resp.status_code == 200
    body = resp.get_json()
    assert body.get("success") is True
    dev_users = body.get("data", {}).get("dev_users", [])
    assert len(dev_users) >= 7
    identifications = [int(u["id"]) for u in dev_users]
    for ident, _ in populated_roles:
        assert ident in identifications


def test_all_roles_can_login_and_access_profile(client, populated_roles):
    """Verifica que cada uno de los 7 roles puede iniciar sesión y acceder a /auth/me."""
    password = get_test_password()

    for ident, expected_role in populated_roles:
        # 1. Login
        login_resp = client.post(
            f"{BASE}/auth/login", json={"identifier": ident, "password": password}
        )
        assert login_resp.status_code == 200, (
            f"Fallo al autenticar rol {expected_role.value} (ID: {ident})"
        )
        login_body = login_resp.get_json()
        data = login_body.get("data") or login_body
        token = data.get("access_token")
        assert token, f"No se recibió token para {expected_role.value}"

        # 2. Perfil /auth/me
        headers = {"Authorization": f"Bearer {token}"}
        me_resp = client.get(f"{BASE}/auth/me", headers=headers)
        assert me_resp.status_code == 200, (
            f"Error al acceder a /auth/me con {expected_role.value}"
        )
        me_body = me_resp.get_json()
        user_info = (
            me_body.get("data", {}).get("user")
            or me_body.get("user")
            or me_body.get("data")
        )
        assert user_info, (
            f"No se pudo extraer usuario de /auth/me para {expected_role.value}"
        )
        assert user_info.get("identification") == ident
