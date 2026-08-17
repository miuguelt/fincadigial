"""
Tests para verificar la centralización y estandarización del manejo de excepciones.
Valida tanto los códigos de estado HTTP como el formato JSON de APIResponse.error.
"""

import pytest
from app.utils.db_availability import mark_database_available


class TestCentralErrorHandlers:
    """Verifica que las excepciones personalizadas y errores estándar son capturados centralizadamente."""

    def test_business_rule_exception(self, client):
        resp = client.get("/api/test-exceptions/business")
        assert resp.status_code == 400
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert "error" in body
        assert body["error"]["code"] == "TEST_BUSINESS"
        assert body["error"]["message"] == "Regla de negocio rota"
        assert body["error"]["details"] == {"reason": "test"}
        assert "trace_id" in body["error"]

    def test_resource_not_found_exception(self, client):
        resp = client.get("/api/test-exceptions/not-found")
        assert resp.status_code == 404
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert "error" in body
        assert body["error"]["code"] == "NOT_FOUND"
        assert body["error"]["message"] == "Recurso no encontrado"
        assert body["error"]["details"] == {
            "resource_name": "Animal",
            "resource_id": 123,
        }

    def test_forbidden_exception(self, client):
        resp = client.get("/api/test-exceptions/forbidden")
        assert resp.status_code == 403
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "FORBIDDEN"
        assert body["error"]["message"] == "Acceso no permitido"

    def test_unauthorized_exception(self, client):
        resp = client.get("/api/test-exceptions/unauthorized")
        assert resp.status_code == 401
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "UNAUTHORIZED"
        assert body["error"]["message"] == "Token inválido"

    def test_conflict_exception(self, client):
        resp = client.get("/api/test-exceptions/conflict")
        assert resp.status_code == 409
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "CONFLICT"
        assert body["error"]["message"] == "Conflicto con recurso"

    def test_validation_error_exception(self, client):
        resp = client.get("/api/test-exceptions/validation")
        assert resp.status_code == 422
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "VALIDATION_ERROR"
        assert "validation_errors" in body["error"]["details"]
        assert body["error"]["details"]["validation_errors"] == ["Campo X es inválido"]

    def test_generic_exception_handling(self, client):
        resp = client.get("/api/test-exceptions/generic")
        assert resp.status_code == 500
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "INTERNAL_ERROR"

    def test_value_error_handling(self, client):
        resp = client.get("/api/test-exceptions/value-error")
        assert resp.status_code == 400
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "VALUE_ERROR"
        assert body["error"]["message"] == "Error en los datos"

    def test_key_error_handling(self, client):
        resp = client.get("/api/test-exceptions/key-error")
        assert resp.status_code == 400
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "MISSING_FIELD"
        assert "campo_faltante" in body["error"]["details"]["error"]

    def test_integrity_unique_constraint(self, client):
        resp = client.get("/api/test-exceptions/integrity-unique")
        assert resp.status_code == 409
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "DUPLICATE_ENTRY"
        assert body["error"]["message"] == "Ya existe un registro con esos datos"

    def test_integrity_foreign_key_constraint(self, client):
        resp = client.get("/api/test-exceptions/integrity-fk")
        assert resp.status_code == 409
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "FOREIGN_KEY_VIOLATION"
        assert (
            body["error"]["message"]
            == "No se puede completar la operación: datos relacionados no válidos"
        )

    def test_integrity_not_null_constraint(self, client):
        resp = client.get("/api/test-exceptions/integrity-notnull")
        assert resp.status_code == 409
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "MISSING_REQUIRED_DATA"
        assert body["error"]["message"] == "Faltan datos requeridos"

    def test_operational_database_error_returns_503(self, client):
        mark_database_available()
        resp = client.get("/api/test-exceptions/operational-db")
        assert resp.status_code == 503
        assert resp.headers.get("Retry-After")
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "DATABASE_UNAVAILABLE"
        assert body["error"]["details"]["retry_after_seconds"] >= 0
        mark_database_available()

    def test_database_cooldown_short_circuits_requests(self, client):
        mark_database_available()
        client.get("/api/test-exceptions/operational-db")
        resp = client.get("/api/test-exceptions/business")
        assert resp.status_code == 503
        assert resp.headers.get("Retry-After")
        body = resp.get_json()
        assert body["error"]["code"] == "DATABASE_UNAVAILABLE"
        mark_database_available()

    def test_http_404_route_not_found(self, client):
        resp = client.get("/api/test-exceptions/does-not-exist-route/subpath")
        assert resp.status_code == 404
        assert resp.is_json
        body = resp.get_json()
        assert "message" in body or "error" in body

    def test_http_405_method_not_allowed(self, client):
        resp = client.put("/api/test-exceptions/business")
        assert resp.status_code == 405
        assert resp.is_json
        body = resp.get_json()
        assert body["success"] is False
        assert body["error"]["code"] == "METHOD_NOT_ALLOWED"
