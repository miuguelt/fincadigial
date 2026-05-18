"""
Tests para app/middleware.py y app/utils/error_standardization.py.

Verifica que el middleware de timing, JSON y seguridad funcionan correctamente
en todas las respuestas de la API.
"""
import pytest

BASE = "/api/v1"


class TestRequestTiming:
    def test_x_response_time_en_get(self, client, token_for):
        """Todas las respuestas deben incluir X-Response-Time-ms."""
        resp = client.get(f"{BASE}/health", headers=token_for("Administrador"))
        assert "X-Response-Time-ms" in resp.headers

    def test_x_response_time_es_numerico(self, client):
        resp = client.get(f"{BASE}/health")
        assert "X-Response-Time-ms" in resp.headers
        val = resp.headers["X-Response-Time-ms"]
        float(val)  # no debe lanzar ValueError

    def test_x_response_time_en_post(self, client, token_for):
        """POST también incluye el header."""
        resp = client.post(
            f"{BASE}/auth/login",
            json={"identifier": 0, "password": "x"},
        )
        assert "X-Response-Time-ms" in resp.headers

    def test_x_response_time_en_401(self, client):
        """Respuestas de error también tienen el header."""
        resp = client.get(f"{BASE}/animals")
        assert "X-Response-Time-ms" in resp.headers

    def test_x_response_time_en_403(self, client, token_for):
        resp = client.delete(f"{BASE}/animals/1", headers=token_for("Aprendiz"))
        assert resp.status_code == 403
        assert "X-Response-Time-ms" in resp.headers


class TestSecurityHeaders:
    """Los headers de seguridad deben estar presentes (X-Content-Type-Options etc.)."""

    def test_x_content_type_options(self, client):
        resp = client.get(f"{BASE}/health")
        assert resp.headers.get("X-Content-Type-Options") == "nosniff"

    def test_x_frame_options(self, client):
        resp = client.get(f"{BASE}/health")
        # Puede ser DENY o SAMEORIGIN
        assert resp.headers.get("X-Frame-Options") in ("DENY", "SAMEORIGIN")


class TestContentType:
    def test_respuesta_get_es_json(self, client):
        resp = client.get(f"{BASE}/health")
        assert "application/json" in resp.content_type

    def test_respuesta_post_es_json(self, client):
        resp = client.post(f"{BASE}/auth/login", json={"identifier": 0, "password": "x"})
        assert "application/json" in resp.content_type

    def test_respuesta_401_es_json(self, client):
        resp = client.get(f"{BASE}/animals")
        assert "application/json" in resp.content_type

    def test_respuesta_403_es_json(self, client, token_for):
        resp = client.delete(f"{BASE}/animals/1", headers=token_for("Aprendiz"))
        assert "application/json" in resp.content_type


class TestPublicPaths:
    """Rutas públicas accesibles sin JWT."""

    def test_login_sin_token(self, client):
        resp = client.post(f"{BASE}/auth/login", json={})
        assert resp.status_code != 401

    def test_health_sin_token(self, client):
        resp = client.get(f"{BASE}/health")
        assert resp.status_code == 200

    def test_swagger_docs_sin_token(self, client):
        resp = client.get(f"{BASE}/docs/")
        assert resp.status_code == 200

    def test_swagger_json_sin_token(self, client):
        resp = client.get(f"{BASE}/swagger.json")
        assert resp.status_code == 200

    def test_ruta_protegida_sin_token(self, client):
        """Ruta protegida sin token devuelve 401, no 403 ni 500."""
        resp = client.get(f"{BASE}/animals")
        assert resp.status_code == 401

    def test_options_preflight_permitido(self, client):
        """OPTIONS (preflight CORS) no requiere JWT."""
        resp = client.options(f"{BASE}/animals")
        assert resp.status_code != 401


class TestDashAliases:
    """Los aliases dash→underscore deben redirigir correctamente (308)."""

    def test_food_types_dash_alias(self, client, token_for):
        resp = client.get(f"{BASE}/food-types", headers=token_for("Administrador"))
        # Debe redirigir a food_types (308) o servir la respuesta directamente
        assert resp.status_code in (200, 308)
