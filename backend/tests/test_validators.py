import pytest
import flask
from unittest.mock import MagicMock, patch
from app.utils.validators import (
    ValidationError,
    SecurityValidator,
    sanitize_string,
    validate_email,
    validate_phone,
    validate_identification,
    validate_password,
    RequestValidator,
    validate_request_size,
    PerformanceLogger
)
from app.utils.response_handler import APIResponse

@pytest.mark.unit
@pytest.mark.critical
def test_validation_error():
    err = ValidationError("Mensaje de prueba", field="email", code="invalid_format")
    assert err.message == "Mensaje de prueba"
    assert err.field == "email"
    assert err.code == "invalid_format"

    err_default = ValidationError("Error simple")
    assert err_default.message == "Error simple"
    assert err_default.field is None
    assert err_default.code == "validation_error"

@pytest.mark.unit
@pytest.mark.critical
def test_check_malicious_content_safe():
    # Cadenas normales no deberían lanzar excepción
    SecurityValidator.check_malicious_content("Hola Mundo")
    SecurityValidator.check_malicious_content("mi_correo@dominio.com")
    SecurityValidator.check_malicious_content("3001234567")

@pytest.mark.unit
@pytest.mark.critical
def test_check_malicious_content_non_string():
    # Tipos de datos no string deberían retornar inmediatamente sin error
    SecurityValidator.check_malicious_content(None)
    SecurityValidator.check_malicious_content(12345)
    SecurityValidator.check_malicious_content({"key": "value"})

@pytest.mark.unit
@pytest.mark.critical
def test_check_malicious_content_sqli():
    # Patrones sospechosos SQLi
    with pytest.raises(ValidationError) as excinfo:
        SecurityValidator.check_malicious_content("SELECT * FROM users")
    assert "Contenido no permitido" in str(excinfo.value)
    assert excinfo.value.code == "malicious_content"

    with pytest.raises(ValidationError):
        SecurityValidator.check_malicious_content("1; DROP TABLE animales")

    with pytest.raises(ValidationError):
        SecurityValidator.check_malicious_content("admin OR 1=1")

    with pytest.raises(ValidationError):
        SecurityValidator.check_malicious_content("EXEC sp_executesql")

@pytest.mark.unit
@pytest.mark.critical
def test_check_malicious_content_xss():
    # Patrones sospechosos XSS
    with pytest.raises(ValidationError) as excinfo:
        SecurityValidator.check_malicious_content("<script>alert('hacked')</script>")
    assert "Contenido no permitido" in str(excinfo.value)

    with pytest.raises(ValidationError):
        SecurityValidator.check_malicious_content("<iframe src='url'>")

    with pytest.raises(ValidationError):
        SecurityValidator.check_malicious_content("javascript:void(0)")

    with pytest.raises(ValidationError):
        SecurityValidator.check_malicious_content("onload=alert(1)")

@pytest.mark.unit
@pytest.mark.critical
def test_check_malicious_content_path_traversal():
    # Patrones sospechosos de Path Traversal
    with pytest.raises(ValidationError) as excinfo:
        SecurityValidator.check_malicious_content("../../etc/passwd")
    assert "Contenido no permitido" in str(excinfo.value)

    with pytest.raises(ValidationError):
        SecurityValidator.check_malicious_content("..\\windows\\win.ini")

    with pytest.raises(ValidationError):
        SecurityValidator.check_malicious_content("%2e%2e%2fetc")

@pytest.mark.unit
@pytest.mark.critical
def test_require_admin_role_success():
    @SecurityValidator.require_admin_role
    def dummy_route():
        return "allowed"

    # Caso exitoso: claims y base de datos indican Administrador
    with patch('app.utils.validators.get_jwt_identity', return_value="1"), \
         patch('app.utils.validators.get_jwt', return_value={"role": "Administrador"}), \
         patch('app.models.user.User.get_by_id') as mock_get_by_id:
        
        mock_user = MagicMock()
        mock_user.role.value = "Administrador"
        mock_user.status = True
        mock_get_by_id.return_value = mock_user

        assert dummy_route() == "allowed"

@pytest.mark.unit
@pytest.mark.critical
def test_require_admin_role_db_fallback_token_success():
    @SecurityValidator.require_admin_role
    def dummy_route():
        return "allowed"

    # Caso en que no se encuentra en la DB pero el token tiene el rol
    with patch('app.utils.validators.get_jwt_identity', return_value="1"), \
         patch('app.utils.validators.get_jwt', return_value={"role": "Administrador"}), \
         patch('app.models.user.User.get_by_id', return_value=None):
        
        assert dummy_route() == "allowed"

@pytest.mark.unit
@pytest.mark.critical
def test_require_admin_role_forbidden():
    @SecurityValidator.require_admin_role
    def dummy_route():
        return "allowed"

    # Caso de rol incorrecto (Operario)
    with patch('app.utils.validators.get_jwt_identity', return_value="2"), \
         patch('app.utils.validators.get_jwt', return_value={"role": "Operario"}), \
         patch('app.models.user.User.get_by_id') as mock_get_by_id:
        
        mock_user = MagicMock()
        mock_user.role.value = "Operario"
        mock_user.status = True
        mock_get_by_id.return_value = mock_user

        res, code = dummy_route()
        assert code == 403
        assert res["success"] is False
        assert "Administrador" in res["message"]

@pytest.mark.unit
@pytest.mark.critical
def test_require_admin_role_inactive_user():
    @SecurityValidator.require_admin_role
    def dummy_route():
        return "allowed"

    # Caso de usuario inactivo (status = False)
    with patch('app.utils.validators.get_jwt_identity', return_value="1"), \
         patch('app.utils.validators.get_jwt', return_value={"role": "Administrador"}), \
         patch('app.models.user.User.get_by_id') as mock_get_by_id:
        
        mock_user = MagicMock()
        mock_user.role.value = "Administrador"
        mock_user.status = False
        mock_get_by_id.return_value = mock_user

        res, code = dummy_route()
        assert code == 403
        assert res["success"] is False

@pytest.mark.unit
@pytest.mark.critical
def test_require_admin_role_db_lookup_exception():
    @SecurityValidator.require_admin_role
    def dummy_route():
        return "allowed"

    # Caso en que la consulta a la BD falla (ej. error de conexión)
    with patch('app.utils.validators.get_jwt_identity', return_value="1"), \
         patch('app.utils.validators.get_jwt', return_value={"role": "Administrador"}), \
         patch('app.models.user.User.get_by_id', side_effect=Exception("Database down")):
        
        # Debe capturar la excepción y usar el token_role ("Administrador") -> Permitido
        assert dummy_route() == "allowed"

@pytest.mark.unit
@pytest.mark.critical
def test_require_admin_role_unauthorized():
    @SecurityValidator.require_admin_role
    def dummy_route():
        return "allowed"

    # Caso en que get_jwt_identity lanza una excepción (por no tener token en absoluto)
    with patch('app.utils.validators.get_jwt_identity', side_effect=RuntimeError("No JWT found")):
        res, code = dummy_route()
        assert code == 401
        assert res["success"] is False
        assert "Token JWT inválido" in res["message"]

@pytest.mark.unit
@pytest.mark.critical
def test_sanitize_string():
    # No string
    assert sanitize_string(123) == "123"
    assert sanitize_string(None) == "None"

    # Unicode NFKC normalization (combining characters unified)
    normalized = sanitize_string("e\u0301") # e + combining acute accent
    assert normalized == "é"

    # Control characters removal (\x00-\x1f)
    assert sanitize_string("Hello\x00World\x0a") == "HelloWorld"

    # Clean spaces (split and join)
    assert sanitize_string("  Hola    a    todos  ") == "Hola a todos"

    # Max length
    assert sanitize_string("abcdef", max_length=3) == "abc"
    assert sanitize_string("abcdef", max_length=10) == "abcdef"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_email_success():
    assert validate_email("MIGUEL@villaluz.com") == "miguel@villaluz.com"
    assert validate_email("test.name+filter@domain.co") == "test.name+filter@domain.co"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_email_missing():
    with pytest.raises(ValidationError) as excinfo:
        validate_email("")
    assert "email es requerido" in str(excinfo.value)

    with pytest.raises(ValidationError):
        validate_email(None)

@pytest.mark.unit
@pytest.mark.critical
def test_validate_email_invalid_format():
    invalid_emails = [
        "plainaddress",
        "#@%^%#$@#$@#.com",
        "@domain.com",
        "Joe Smith <email@domain.com>",
        "email.domain.com",
        "email@domain@domain.com",
        "email@domain"
    ]
    for email in invalid_emails:
        with pytest.raises(ValidationError) as excinfo:
            validate_email(email)
        assert "formato válido" in str(excinfo.value)
        assert excinfo.value.code == "invalid_format"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_email_too_long():
    # RFC 5321 limit: Local part > 64 chars
    long_local = "a" * 65 + "@domain.com"
    with pytest.raises(ValidationError) as excinfo:
        validate_email(long_local)
    assert "demasiado largo" in str(excinfo.value)
    assert excinfo.value.code == "too_long"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_email_malicious():
    with pytest.raises(ValidationError):
        validate_email("test;drop@domain.com")

@pytest.mark.unit
@pytest.mark.critical
def test_validate_phone_success():
    assert validate_phone("3001234567") == "3001234567"
    assert validate_phone("+57 300 123 4567") == "+57 300 123 4567"
    assert validate_phone("(300) 123-4567") == "(300) 123-4567"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_phone_missing():
    with pytest.raises(ValidationError):
        validate_phone("")
    with pytest.raises(ValidationError):
        validate_phone(None)

@pytest.mark.unit
@pytest.mark.critical
def test_validate_phone_invalid():
    invalid_phones = [
        "123",              # Muy corto
        "3001234567890123", # Muy largo
        "abc",              # Caracteres no permitidos
        "+1 202 555 0191"   # No colombiano (formato inválido)
    ]
    for phone in invalid_phones:
        with pytest.raises(ValidationError) as excinfo:
            validate_phone(phone)
        assert "formato válido" in str(excinfo.value)

@pytest.mark.unit
@pytest.mark.critical
def test_validate_phone_malicious():
    with pytest.raises(ValidationError):
        validate_phone("3001234567; SELECT")

@pytest.mark.unit
@pytest.mark.critical
def test_validate_identification_success():
    assert validate_identification(1098) == 1098
    assert validate_identification("1098") == 1098

@pytest.mark.unit
@pytest.mark.critical
def test_validate_identification_missing():
    with pytest.raises(ValidationError) as excinfo:
        validate_identification(None)
    assert "es requerido" in str(excinfo.value)

@pytest.mark.unit
@pytest.mark.critical
def test_validate_identification_invalid_type():
    with pytest.raises(ValidationError) as excinfo:
        validate_identification("abc")
    assert "debe ser un número" in str(excinfo.value)
    assert excinfo.value.code == "invalid_type"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_identification_negative():
    with pytest.raises(ValidationError) as excinfo:
        validate_identification(0)
    assert "número positivo" in str(excinfo.value)
    assert excinfo.value.code == "invalid_range"

    with pytest.raises(ValidationError):
        validate_identification(-5)

@pytest.mark.unit
@pytest.mark.critical
def test_validate_identification_too_long():
    with pytest.raises(ValidationError) as excinfo:
        validate_identification(99999999999) # 11 dígitos
    assert "demasiado largo" in str(excinfo.value)
    assert excinfo.value.code == "too_long"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_password_success():
    # Debe pasar complejidad: min 8, max 128, y al menos 3 grupos
    validate_password("Valid123!") # Mayus, minus, digito, especial (4 grupos)
    validate_password("validOne9")  # Mayus, minus, digito (3 grupos)

@pytest.mark.unit
@pytest.mark.critical
def test_validate_password_missing():
    with pytest.raises(ValidationError):
        validate_password("")
    with pytest.raises(ValidationError):
        validate_password(None)

@pytest.mark.unit
@pytest.mark.critical
def test_validate_password_too_short():
    with pytest.raises(ValidationError) as excinfo:
        validate_password("Sh1!")
    assert "al menos 8 caracteres" in str(excinfo.value)
    assert excinfo.value.code == "too_short"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_password_too_long():
    with pytest.raises(ValidationError) as excinfo:
        validate_password("A" * 129)
    assert "demasiado larga" in str(excinfo.value)
    assert excinfo.value.code == "too_long"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_password_weak():
    with pytest.raises(ValidationError) as excinfo:
        validate_password("password") # Solo minúsculas (1 grupo)
    assert "al menos 3 de" in str(excinfo.value)
    assert excinfo.value.code == "weak_password"

    with pytest.raises(ValidationError):
        validate_password("password12") # Minúsculas y dígitos (2 grupos)

@pytest.mark.unit
@pytest.mark.critical
def test_validate_request_size_success():
    data = {f"field_{i}": "short_string" for i in range(40)}
    validate_request_size(data)

@pytest.mark.unit
@pytest.mark.critical
def test_validate_request_size_too_many_fields():
    data = {f"field_{i}": "val" for i in range(60)}
    with pytest.raises(ValidationError) as excinfo:
        validate_request_size(data, max_fields=50)
    assert "Demasiados campos" in str(excinfo.value)
    assert excinfo.value.code == "request_too_large"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_request_size_too_large_strings():
    data = {
        "field1": "a" * 80000,
        "field2": "b" * 21000
    }
    with pytest.raises(ValidationError) as excinfo:
        validate_request_size(data)
    assert "Solicitud demasiado grande" in str(excinfo.value)
    assert excinfo.value.code == "request_too_large"

@pytest.mark.unit
@pytest.mark.critical
def test_validate_json_required_decorator(app):
    @RequestValidator.validate_json_required
    def dummy_route():
        return "success"

    # Caso exitoso
    with app.test_request_context(
        json={"name": "Miguel"},
        headers={"Content-Type": "application/json"}
    ):
        assert dummy_route() == "success"

    # Sin Content-Type JSON
    with app.test_request_context(
        data="not json",
        headers={"Content-Type": "text/plain"}
    ):
        res, code = dummy_route()
        assert code == 422
        assert res["success"] is False
        assert "application/json" in res["error"]["details"]["validation_errors"]["content_type"]

    # Con JSON inválido (get_json lanza error)
    with app.test_request_context(
        data="{'invalid_json'",
        headers={"Content-Type": "application/json"}
    ):
        res, code = dummy_route()
        assert code == 422
        assert res["success"] is False
        assert "json" in res["error"]["details"]["validation_errors"]

@pytest.mark.unit
@pytest.mark.critical
def test_validate_fields_decorator(app):
    @RequestValidator.validate_fields(
        required_fields=["name", "age"],
        optional_fields=["notes"],
        field_types={"name": str, "age": int}
    )
    def dummy_route():
        return "success"

    # Caso exitoso
    with app.test_request_context(
        json={"name": "Miguel", "age": 25, "notes": "Some notes"},
        headers={"Content-Type": "application/json"}
    ):
        assert dummy_route() == "success"

    # Falta campo requerido
    with app.test_request_context(
        json={"name": "Miguel"},
        headers={"Content-Type": "application/json"}
    ):
        res, code = dummy_route()
        assert code == 422
        assert res["success"] is False
        assert "age" in res["error"]["details"]["validation_errors"]

    # Campo requerido vacío o espacio en blanco
    with app.test_request_context(
        json={"name": "   ", "age": 25},
        headers={"Content-Type": "application/json"}
    ):
        res, code = dummy_route()
        assert code == 422
        assert "name" in res["error"]["details"]["validation_errors"]

    # Tipo de campo incorrecto
    with app.test_request_context(
        json={"name": "Miguel", "age": "twenty-five"},
        headers={"Content-Type": "application/json"}
    ):
        res, code = dummy_route()
        assert code == 422
        assert "age" in res["error"]["details"]["validation_errors"]

    # Campo no permitido
    with app.test_request_context(
        json={"name": "Miguel", "age": 25, "extra": "forbidden"},
        headers={"Content-Type": "application/json"}
    ):
        res, code = dummy_route()
        assert code == 422
        assert "extra" in res["error"]["details"]["validation_errors"]

@pytest.mark.unit
@pytest.mark.critical
def test_performance_logger_decorator(app):
    @PerformanceLogger.log_request_performance
    def dummy_success():
        return "ok", 200

    @PerformanceLogger.log_request_performance
    def dummy_failure():
        raise ValueError("Route crashed")

    # Caso exitoso
    with app.test_request_context(
        path="/test-perf-ok",
        method="GET",
        headers={"Authorization": "Bearer token"}
    ):
        with patch('app.utils.validators.get_jwt_identity', return_value="user_id"):
            res, code = dummy_success()
            assert res == "ok"
            assert code == 200

    # Caso con excepción
    with app.test_request_context(
        path="/test-perf-err",
        method="POST"
    ):
        with pytest.raises(ValueError, match="Route crashed"):
            dummy_failure()
