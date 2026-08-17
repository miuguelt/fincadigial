"""
Tests de integración HTTP para endpoints CRUD críticos.

Verifica: autenticación, formato de respuesta, paginación y errores de validación.
Ningún test necesita datos pre-existentes en BD; usan finca_id del token.
"""

BASE = "/api/v1"

ADMIN = "Administrador"
APRENDIZ = "Aprendiz"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def assert_list_response(body: dict):
    """Un endpoint de lista exitoso devuelve success=True y data iterable."""
    assert body["success"] is True
    assert "data" in body


# ---------------------------------------------------------------------------
# Animales
# ---------------------------------------------------------------------------


class TestAnimalesEndpoints:
    def test_get_list_vacia(self, client, token_for):
        resp = client.get(f"{BASE}/animals", headers=token_for(ADMIN))
        assert resp.status_code == 200
        assert_list_response(resp.get_json())

    def test_get_list_requiere_auth(self, client):
        assert client.get(f"{BASE}/animals").status_code == 401

    def test_post_body_vacio_retorna_error_validacion(self, client, token_for):
        resp = client.post(f"{BASE}/animals", json={}, headers=token_for(ADMIN))
        assert resp.status_code in (400, 422)
        assert resp.get_json()["success"] is False

    def test_get_animal_inexistente(self, client, token_for):
        resp = client.get(f"{BASE}/animals/999999", headers=token_for(ADMIN))
        assert resp.status_code == 404

    def test_paginacion_page_per_page(self, client, token_for):
        resp = client.get(f"{BASE}/animals?page=1&per_page=5", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_filtro_status(self, client, token_for):
        resp = client.get(f"{BASE}/animals?status=Vivo", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_busqueda_search(self, client, token_for):
        resp = client.get(f"{BASE}/animals?search=test", headers=token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Vacunas (catálogo global, sin finca_id)
# ---------------------------------------------------------------------------


class TestVacunasEndpoints:
    def test_get_list(self, client, token_for):
        resp = client.get(f"{BASE}/vaccines", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_get_list_por_instructor_bloqueado(self, client, token_for):
        """Instructor puede ver vaccinations (tabla) pero NO vaccines (catálogo) — rbac.py granular."""
        resp = client.get(f"{BASE}/vaccines", headers=token_for("Instructor"))
        assert resp.status_code == 403

    def test_post_body_invalido(self, client, token_for):
        resp = client.post(f"{BASE}/vaccines", json={}, headers=token_for(ADMIN))
        assert resp.status_code in (400, 422)


# ---------------------------------------------------------------------------
# Potreros (fields)
# ---------------------------------------------------------------------------


class TestFieldsEndpoints:
    def test_get_list(self, client, token_for):
        resp = client.get(f"{BASE}/fields", headers=token_for(ADMIN))
        assert resp.status_code == 200
        assert_list_response(resp.get_json())

    def test_sort_dir_alias_controls_sort_direction(self, client, token_for, app):
        """El alias que emite BaseService debe conservar el orden solicitado."""
        from app.models import Finca, FarmType
        from app.models.fields import Fields, LandStatus

        headers = token_for(ADMIN)
        with app.app_context():
            finca = Finca.query.filter_by(type=FarmType.Tradicional).first()
            db_fields = [
                Fields(
                    name="Potrero B alias",
                    state=LandStatus.Activo,
                    area="1",
                    finca_id=finca.id,
                ),
                Fields(
                    name="Potrero A alias",
                    state=LandStatus.Activo,
                    area="1",
                    finca_id=finca.id,
                ),
            ]
            from app.extensions import db

            db.session.add_all(db_fields)
            db.session.commit()

        asc = client.get(
            f"{BASE}/fields?sort_by=name&sort_dir=asc&cache_bust=1",
            headers=headers,
        )
        desc = client.get(
            f"{BASE}/fields?sort_by=name&sort_dir=desc&cache_bust=1",
            headers=headers,
        )

        assert asc.status_code == 200
        assert desc.status_code == 200
        assert [row["name"] for row in asc.get_json()["data"][:2]] == [
            "Potrero A alias",
            "Potrero B alias",
        ]
        assert [row["name"] for row in desc.get_json()["data"][:2]] == [
            "Potrero B alias",
            "Potrero A alias",
        ]

    def test_post_body_invalido(self, client, token_for):
        resp = client.post(f"{BASE}/fields", json={}, headers=token_for(ADMIN))
        assert resp.status_code in (400, 422)

    def test_aprendiz_no_puede_post(self, client, token_for):
        resp = client.post(f"{BASE}/fields", json={}, headers=token_for(APRENDIZ))
        assert resp.status_code == 403

    def test_put_field_inexistente_con_admin(self, client, token_for):
        """RBAC pasa, handler devuelve 404."""
        resp = client.put(
            f"{BASE}/fields/999999", json={"name": "x"}, headers=token_for(ADMIN)
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Tratamientos
# ---------------------------------------------------------------------------


class TestTratamientosEndpoints:
    def test_get_list(self, client, token_for):
        resp = client.get(f"{BASE}/treatments", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_post_sin_datos_obligatorios(self, client, token_for):
        resp = client.post(f"{BASE}/treatments", json={}, headers=token_for(ADMIN))
        assert resp.status_code in (400, 422)

    def test_instructor_puede_post(self, client, token_for):
        """RBAC permite POST en /treatments para Instructor."""
        resp = client.post(
            f"{BASE}/treatments", json={}, headers=token_for("Instructor")
        )
        # RBAC pasa → validación de datos falla → no 403
        assert resp.status_code != 403
        assert resp.status_code in (400, 422)

    def test_aprendiz_no_puede_post(self, client, token_for):
        resp = client.post(f"{BASE}/treatments", json={}, headers=token_for(APRENDIZ))
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Controles veterinarios
# ---------------------------------------------------------------------------


class TestControlsEndpoints:
    def test_get_list(self, client, token_for):
        # El namespace de controles está en /control (singular), no /controls
        resp = client.get(f"{BASE}/control", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_operario_puede_post_control(self, client, token_for):
        """Operario está en OPERARIO_POST_PATHS para /controls (security_middleware usa ese path)."""
        resp = client.post(
            f"{BASE}/controls",
            json={},
            headers=token_for("Operario", finca_type="Tradicional"),
        )
        # RBAC pasa (no 403); el endpoint real puede estar en /control
        assert resp.status_code != 403

    def test_veterinario_puede_post_control(self, client, token_for):
        resp = client.post(
            f"{BASE}/controls",
            json={},
            headers=token_for("Veterinario", finca_type="Tradicional"),
        )
        assert resp.status_code != 403


# ---------------------------------------------------------------------------
# Enfermedades (catálogo global)
# ---------------------------------------------------------------------------


class TestEnfermedadesEndpoints:
    def test_get_list(self, client, token_for):
        resp = client.get(f"{BASE}/diseases", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_search_diseases(self, client, token_for):
        resp = client.get(f"{BASE}/diseases?search=fiebre", headers=token_for(ADMIN))
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Usuarios (solo Administrador/Propietario)
# ---------------------------------------------------------------------------


class TestUsuariosEndpoints:
    def test_get_lista_admin(self, client, token_for):
        resp = client.get(f"{BASE}/users", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_get_lista_aprendiz_bloqueado(self, client, token_for):
        resp = client.get(f"{BASE}/users", headers=token_for(APRENDIZ))
        assert resp.status_code == 403

    def test_post_usuario_body_invalido(self, client, token_for):
        resp = client.post(f"{BASE}/users", json={}, headers=token_for(ADMIN))
        assert resp.status_code in (400, 422)

    def test_delete_usuario_inexistente(self, client, token_for):
        resp = client.delete(f"{BASE}/users/999999", headers=token_for(ADMIN))
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Inventario
# ---------------------------------------------------------------------------


class TestInventarioEndpoints:
    def test_get_lotes(self, client, token_for):
        resp = client.get(f"{BASE}/inventory/lots", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_post_lote_invalido(self, client, token_for):
        resp = client.post(f"{BASE}/inventory/lots", json={}, headers=token_for(ADMIN))
        assert resp.status_code in (400, 422)


# ---------------------------------------------------------------------------
# Razas y Especies (catálogos globales)
# ---------------------------------------------------------------------------


class TestCatalogosEndpoints:
    def test_get_breeds(self, client, token_for):
        resp = client.get(f"{BASE}/breeds", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_get_species(self, client, token_for):
        resp = client.get(f"{BASE}/species", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_get_vaccines(self, client, token_for):
        resp = client.get(f"{BASE}/vaccines", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_get_medications(self, client, token_for):
        resp = client.get(f"{BASE}/medications", headers=token_for(ADMIN))
        assert resp.status_code == 200

    def test_get_food_types(self, client, token_for):
        resp = client.get(f"{BASE}/food_types", headers=token_for(ADMIN))
        assert resp.status_code == 200
