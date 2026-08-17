"""
Tests de integración HTTP para el middleware RBAC.

Verifican que el middleware en security_middleware.py devuelve 403 cuando
corresponde y permite el paso (200/404/400) cuando el rol tiene acceso.

Estrategia:
  - Para casos BLOQUEADOS: verificar status 403 con error_code del RBAC.
  - Para casos PERMITIDOS: verificar status != 403 (puede ser 200, 404, 400
    dependiendo de si el recurso existe o el body es válido).

No se requiere data en DB para la mayoría de casos porque el RBAC corre
ANTES de que el handler acceda a la BD.
"""

import pytest

BASE = "/api/v1"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def assert_rbac_blocked(resp, expected_code=None):
    """El middleware devolvió 403. Opcionalmente verifica el error_code.

    La estructura de respuesta es:
        {"success": false, "error": {"code": "...", ...}, "message": "..."}
    """
    assert resp.status_code == 403, (
        f"Esperado 403 (RBAC bloqueado), obtenido {resp.status_code}. "
        f"Body: {resp.get_data(as_text=True)[:200]}"
    )
    if expected_code:
        body = resp.get_json() or {}
        actual_code = (body.get("error") or {}).get("code") or body.get("error_code")
        assert actual_code == expected_code, (
            f"Esperado error_code={expected_code}, obtenido: {actual_code}. Body: {body}"
        )


def assert_rbac_allowed(resp):
    """El middleware dejó pasar la request (status != 403)."""
    assert resp.status_code != 403, (
        f"RBAC bloqueó inesperadamente con 403. "
        f"Body: {resp.get_data(as_text=True)[:200]}"
    )


# ---------------------------------------------------------------------------
# Sin autenticación
# ---------------------------------------------------------------------------


class TestSinAutenticacion:
    def test_animales_sin_token_retorna_401(self, client):
        resp = client.get(f"{BASE}/animals")
        assert resp.status_code == 401

    @pytest.mark.critical
    def test_users_sin_token_retorna_401(self, client):
        resp = client.get(f"{BASE}/users")
        assert resp.status_code == 401

    def test_delete_sin_token_retorna_401(self, client):
        resp = client.delete(f"{BASE}/animals/1")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Catálogos operativos compartidos — ninguna pantalla autenticada debe fallar
# al cargar sus opciones por rol.
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    ("role", "finca_type"),
    [
        ("Administrador", "Educativa"),
        ("Propietario", "Tradicional"),
        ("Capataz", "Tradicional"),
        ("Veterinario", "Tradicional"),
        ("Instructor", "Educativa"),
        ("Operario", "Tradicional"),
        ("Aprendiz", "Educativa"),
    ],
)
def test_catalogo_enfermedades_legible_por_todos_los_roles(
    client,
    token_for,
    role,
    finca_type,
):
    resp = client.get(
        f"{BASE}/diseases?page=1&limit=100",
        headers=token_for(role, finca_type=finca_type),
    )
    assert_rbac_allowed(resp)


# ---------------------------------------------------------------------------
# Administrador — acceso total
# ---------------------------------------------------------------------------


class TestAdministrador:
    ROLE = "Administrador"

    def test_get_animals(self, client, token_for):
        resp = client.get(f"{BASE}/animals", headers=token_for(self.ROLE))
        assert_rbac_allowed(resp)

    @pytest.mark.critical
    def test_get_users(self, client, token_for):
        resp = client.get(f"{BASE}/users", headers=token_for(self.ROLE))
        assert_rbac_allowed(resp)

    def test_delete_animal_no_existente(self, client, token_for):
        """RBAC permite DELETE; como el animal no existe, endpoint devuelve 404."""
        resp = client.delete(f"{BASE}/animals/999999", headers=token_for(self.ROLE))
        assert_rbac_allowed(resp)
        assert resp.status_code == 404

    def test_post_animals_body_vacio(self, client, token_for):
        """RBAC permite POST; body vacío devuelve error de validación (no 403)."""
        resp = client.post(f"{BASE}/animals", json={}, headers=token_for(self.ROLE))
        assert_rbac_allowed(resp)
        assert resp.status_code in (400, 422)

    def test_delete_user_no_existente(self, client, token_for):
        resp = client.delete(f"{BASE}/users/999999", headers=token_for(self.ROLE))
        assert_rbac_allowed(resp)


# ---------------------------------------------------------------------------
# Propietario — acceso total (mismo que Administrador)
# ---------------------------------------------------------------------------


class TestPropietario:
    ROLE = "Propietario"

    def test_get_animals(self, client, token_for):
        resp = client.get(
            f"{BASE}/animals", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_allowed(resp)

    def test_get_users(self, client, token_for):
        resp = client.get(
            f"{BASE}/users", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_allowed(resp)

    def test_delete_animal(self, client, token_for):
        resp = client.delete(
            f"{BASE}/animals/999999",
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_allowed(resp)


# ---------------------------------------------------------------------------
# Aprendiz — solo GET, sin /users ni /security
# ---------------------------------------------------------------------------


class TestAprendiz:
    ROLE = "Aprendiz"

    def test_get_animals_permitido(self, client, token_for):
        resp = client.get(f"{BASE}/animals", headers=token_for(self.ROLE))
        assert_rbac_allowed(resp)

    def test_post_animals_bloqueado(self, client, token_for):
        resp = client.post(f"{BASE}/animals", json={}, headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "READONLY_ROLE")

    def test_put_animal_bloqueado(self, client, token_for):
        resp = client.put(f"{BASE}/animals/1", json={}, headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "READONLY_ROLE")

    def test_patch_animal_bloqueado(self, client, token_for):
        resp = client.patch(f"{BASE}/animals/1", json={}, headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "READONLY_ROLE")

    def test_delete_animal_bloqueado(self, client, token_for):
        resp = client.delete(f"{BASE}/animals/1", headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "READONLY_ROLE")

    @pytest.mark.critical
    def test_get_users_bloqueado(self, client, token_for):
        resp = client.get(f"{BASE}/users", headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "APRENDIZ_NO_USERS")

    def test_get_security_bloqueado(self, client, token_for):
        resp = client.get(f"{BASE}/security/audit", headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "APRENDIZ_NO_USERS")


# ---------------------------------------------------------------------------
# Instructor — GET + POST solo en salud, sin /users, sin PUT/PATCH/DELETE
# ---------------------------------------------------------------------------


class TestInstructor:
    ROLE = "Instructor"

    def test_get_animals_permitido(self, client, token_for):
        resp = client.get(f"{BASE}/animals", headers=token_for(self.ROLE))
        assert_rbac_allowed(resp)

    def test_put_animal_bloqueado(self, client, token_for):
        resp = client.put(f"{BASE}/animals/1", json={}, headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "INSTRUCTOR_NO_MODIFY")

    def test_patch_animal_bloqueado(self, client, token_for):
        resp = client.patch(f"{BASE}/animals/1", json={}, headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "INSTRUCTOR_NO_MODIFY")

    def test_delete_animal_bloqueado(self, client, token_for):
        resp = client.delete(f"{BASE}/animals/1", headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "INSTRUCTOR_NO_MODIFY")

    def test_post_animal_bloqueado(self, client, token_for):
        """POST /animals no es ruta de salud → bloqueado para Instructor."""
        resp = client.post(f"{BASE}/animals", json={}, headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "INSTRUCTOR_HEALTH_ONLY")

    def test_post_vaccination_permitido(self, client, token_for):
        """/vaccinations es HEALTH_PATH → Instructor puede POST (pasa RBAC)."""
        resp = client.post(
            f"{BASE}/vaccinations", json={}, headers=token_for(self.ROLE)
        )
        assert_rbac_allowed(resp)
        # Puede ser 400/422 por body vacío, pero no 403
        assert resp.status_code in (400, 422)

    def test_post_treatment_permitido(self, client, token_for):
        resp = client.post(f"{BASE}/treatments", json={}, headers=token_for(self.ROLE))
        assert_rbac_allowed(resp)

    def test_post_control_permitido(self, client, token_for):
        resp = client.post(f"{BASE}/controls", json={}, headers=token_for(self.ROLE))
        assert_rbac_allowed(resp)

    def test_get_users_bloqueado(self, client, token_for):
        resp = client.get(f"{BASE}/users", headers=token_for(self.ROLE))
        assert_rbac_blocked(resp, "INSTRUCTOR_NO_USERS")


# ---------------------------------------------------------------------------
# Capataz — GET + POST + PUT/PATCH en animales/potreros, no DELETE, no /users
# ---------------------------------------------------------------------------


class TestCapataz:
    ROLE = "Capataz"

    def test_get_animals_permitido(self, client, token_for):
        resp = client.get(
            f"{BASE}/animals", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_allowed(resp)

    @pytest.mark.critical
    def test_delete_animal_bloqueado(self, client, token_for):
        resp = client.delete(
            f"{BASE}/animals/1", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_blocked(resp, "CAPATAZ_NO_DELETE")

    def test_put_animal_permitido(self, client, token_for):
        """/animals está en allowed_prefixes de Capataz → pasa RBAC."""
        resp = client.put(
            f"{BASE}/animals/999999",
            json={},
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_allowed(resp)

    def test_put_vaccination_bloqueado(self, client, token_for):
        """/vaccinations no está en allowed_prefixes → RBAC bloquea PUT."""
        resp = client.put(
            f"{BASE}/vaccinations/1",
            json={},
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_blocked(resp, "CAPATAZ_EDIT_LIMITED")

    def test_get_users_bloqueado(self, client, token_for):
        resp = client.get(
            f"{BASE}/users", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_blocked(resp, "CAPATAZ_NO_USERS")

    def test_put_field_permitido(self, client, token_for):
        """/fields está en allowed_prefixes de Capataz."""
        resp = client.put(
            f"{BASE}/fields/999999",
            json={},
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_allowed(resp)


# ---------------------------------------------------------------------------
# Veterinario — solo HEALTH_PATHS, solo GET/POST
# ---------------------------------------------------------------------------


class TestVeterinario:
    ROLE = "Veterinario"

    def test_get_animals_permitido(self, client, token_for):
        resp = client.get(
            f"{BASE}/animals", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_allowed(resp)

    def test_get_users_bloqueado(self, client, token_for):
        resp = client.get(
            f"{BASE}/users", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_blocked(resp, "VET_HEALTH_ONLY")

    def test_get_vaccination_permitido(self, client, token_for):
        resp = client.get(
            f"{BASE}/vaccinations",
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_allowed(resp)

    def test_get_treatment_permitido(self, client, token_for):
        resp = client.get(
            f"{BASE}/treatments", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_allowed(resp)

    def test_post_vaccination_permitido(self, client, token_for):
        resp = client.post(
            f"{BASE}/vaccinations",
            json={},
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_allowed(resp)

    def test_put_vaccination_bloqueado(self, client, token_for):
        resp = client.put(
            f"{BASE}/vaccinations/1",
            json={},
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_blocked(resp, "VET_CREATE_ONLY")

    def test_delete_vaccination_bloqueado(self, client, token_for):
        resp = client.delete(
            f"{BASE}/vaccinations/1",
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_blocked(resp, "VET_CREATE_ONLY")


# ---------------------------------------------------------------------------
# Operario — GET + POST solo en controles/traslados, no PUT/PATCH/DELETE
# ---------------------------------------------------------------------------


class TestOperario:
    ROLE = "Operario"

    def test_get_animals_permitido(self, client, token_for):
        resp = client.get(
            f"{BASE}/animals", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_allowed(resp)

    def test_put_animal_bloqueado(self, client, token_for):
        resp = client.put(
            f"{BASE}/animals/1",
            json={},
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_blocked(resp, "OPERARIO_LIMITED")

    def test_delete_animal_bloqueado(self, client, token_for):
        resp = client.delete(
            f"{BASE}/animals/1", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_blocked(resp, "OPERARIO_LIMITED")

    @pytest.mark.critical
    def test_post_animal_bloqueado(self, client, token_for):
        """/animals no está en OPERARIO_POST_PATHS → bloqueado."""
        resp = client.post(
            f"{BASE}/animals",
            json={},
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_blocked(resp, "OPERARIO_POST_LIMITED")

    def test_post_control_permitido(self, client, token_for):
        """/controls está en OPERARIO_POST_PATHS → pasa RBAC."""
        resp = client.post(
            f"{BASE}/controls",
            json={},
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_allowed(resp)

    def test_post_animal_fields_permitido(self, client, token_for):
        """/animal-fields está en OPERARIO_POST_PATHS → pasa RBAC."""
        resp = client.post(
            f"{BASE}/animal-fields",
            json={},
            headers=token_for(self.ROLE, finca_type="Tradicional"),
        )
        assert_rbac_allowed(resp)

    def test_get_users_bloqueado(self, client, token_for):
        resp = client.get(
            f"{BASE}/users", headers=token_for(self.ROLE, finca_type="Tradicional")
        )
        assert_rbac_blocked(resp, "OPERARIO_NO_USERS")
