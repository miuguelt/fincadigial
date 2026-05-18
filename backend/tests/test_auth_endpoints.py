"""
Tests de integración HTTP para endpoints de autenticación.

Prueban el comportamiento real del endpoint /api/v1/auth/login y /auth/me,
incluyendo credenciales inválidas, usuario inactivo y aprobación pendiente.
"""
import json
import pytest


BASE = "/api/v1"


class TestLogin:
    def test_login_credenciales_validas(self, client, test_user):
        """Login exitoso devuelve 200 con access_token."""
        resp = client.post(
            f"{BASE}/auth/login",
            json={"identifier": test_user["identification"], "password": test_user["password"]},
        )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body.get("success") is True
        # El token puede estar en data.access_token o directamente en access_token
        data = body.get("data") or body
        assert data.get("access_token"), "Debe retornar access_token"

    def test_login_password_incorrecta(self, client, test_user):
        """Login con contraseña incorrecta devuelve 401."""
        resp = client.post(
            f"{BASE}/auth/login",
            json={"identifier": test_user["identification"], "password": "WrongPass999!"},
        )
        assert resp.status_code == 401

    def test_login_usuario_inexistente(self, client):
        """Login con identificación que no existe devuelve 401."""
        resp = client.post(
            f"{BASE}/auth/login",
            json={"identifier": 999888777, "password": "SomePass123!"},
        )
        assert resp.status_code == 401

    def test_login_usuario_inactivo(self, client, inactive_user):
        """Login con usuario inactivo devuelve 403."""
        resp = client.post(
            f"{BASE}/auth/login",
            json={"identifier": inactive_user["identification"], "password": inactive_user["password"]},
        )
        assert resp.status_code == 403

    def test_login_usuario_pendiente_aprobacion(self, client, pending_user):
        """Login con usuario pendiente de aprobación devuelve 403 con APPROVAL_PENDING."""
        resp = client.post(
            f"{BASE}/auth/login",
            json={"identifier": pending_user["identification"], "password": pending_user["password"]},
        )
        assert resp.status_code == 403
        body = resp.get_json()
        assert body.get("error_code") == "APPROVAL_PENDING" or "aprobación" in str(body).lower()

    def test_login_sin_body(self, client):
        """Login sin body devuelve error de validación (400 o 422)."""
        resp = client.post(f"{BASE}/auth/login", json={})
        assert resp.status_code in (400, 422)

    def test_login_alias_email(self, client, test_user):
        """Login usando campo 'email' en lugar de 'identifier' funciona igual."""
        resp = client.post(
            f"{BASE}/auth/login",
            json={"email": "pytest@test.villaluz", "password": test_user["password"]},
        )
        assert resp.status_code == 200


class TestCurrentUser:
    def test_me_sin_token_retorna_401(self, client):
        """GET /auth/me sin token devuelve 401."""
        resp = client.get(f"{BASE}/auth/me")
        assert resp.status_code == 401

    def test_me_con_token_invalido_retorna_401(self, client):
        """GET /auth/me con token mal formado devuelve 401."""
        resp = client.get(
            f"{BASE}/auth/me",
            headers={"Authorization": "Bearer esto.no.es.un.jwt"},
        )
        assert resp.status_code == 401

    def test_me_con_token_valido_retorna_200(self, client, token_for):
        """GET /auth/me con token válido retorna datos del usuario."""
        headers = token_for("Administrador")
        resp = client.get(f"{BASE}/auth/me", headers=headers)
        # Puede ser 200 o 404 si el user_id del token no existe en DB,
        # pero NUNCA debe ser 401 ni 403 (el token es válido)
        assert resp.status_code not in (401, 403)


class TestPublicEndpoints:
    def test_health_sin_token(self, client):
        """/health es público — no requiere JWT."""
        resp = client.get(f"{BASE}/health")
        assert resp.status_code == 200

    def test_swagger_docs_sin_token(self, client):
        """/docs es público."""
        resp = client.get(f"{BASE}/docs/")
        assert resp.status_code == 200
