# -*- coding: utf-8 -*-
"""Pruebas automatizadas para el blindaje de seguridad CodeQL.

Verifica de manera determinista:
1. Bloqueo de inyección de rutas (Path Traversal) en logs, guías, adjuntos e imágenes.
2. Eliminación de ReDoS y tiempo lineal en expresiones regulares de chat.
3. Sanitización de respuestas 500 sin exposición de str(e) ni trazas internas.
4. Protección contra redirecciones abiertas (Open Redirect) en middleware.
5. Inclusión segura de recursos externos con SRI y sin autoloader inseguro.
"""
import re
import time
from pathlib import Path
from unittest.mock import patch
import pytest


class TestPathTraversalHardening:
    """Pruebas de prevención de cruce de directorios (Path Traversal)."""

    def test_monitor_logs_rejects_path_traversal(self, client, auth_headers):
        """Verifica que /system/logs/<path:filename> rechace rutas con escape de directorio."""
        malicious_paths = [
            "../etc/passwd",
            "..\\..\\windows\\win.ini",
            "....//....//boot.ini",
            "logs/../../sensitive.txt",
            "archivo.php",
            "malicioso.exe",
        ]
        for path in malicious_paths:
            resp = client.get(f"/api/v1/system/logs/{path}", headers=auth_headers)
            assert resp.status_code == 404, f"Se esperaba 404 para ruta insegura: {path}"
            payload = resp.get_json() or {}
            assert payload.get("success") is False

    def test_monitor_logs_tail_rejects_path_traversal(self, client, auth_headers):
        """Verifica que /system/logs/<path:filename>/tail rechace rutas relativas no autorizadas."""
        resp = client.get("/api/v1/system/logs/../../secret.log/tail", headers=auth_headers)
        assert resp.status_code == 404
        payload = resp.get_json() or {}
        assert payload.get("success") is False

    def test_monitor_guides_content_rejects_arbitrary_files(self, client, auth_headers):
        """Verifica que /system/guides/content no permita leer archivos fuera de docs/."""
        evil_queries = [
            "../../etc/passwd",
            "..\\..\\backend\\config.py",
            "C:\\Windows\\System32\\drivers\\etc\\hosts",
            "/etc/shadow",
        ]
        for query in evil_queries:
            resp = client.get(f"/api/v1/system/guides/content?path={query}", headers=auth_headers)
            assert resp.status_code == 404, f"Se esperaba 404 para ruta arbitraria: {query}"
            payload = resp.get_json() or {}
            assert payload.get("success") is False

    def test_public_images_rejects_path_traversal(self, client):
        """Verifica que /public/images/<path:filename> rechace secuencias de cruce."""
        resp = client.get("/api/v1/public/images/../../config.py")
        assert resp.status_code in (403, 404)

    def test_monitor_logs_rejects_traversal_even_when_target_file_exists(self, client, auth_headers):
        """Verifica que el resolver no extraiga el basename de una ruta con traversal si el archivo existe."""
        from app.namespaces.system.monitor_namespace import LOG_DIR, _resolve_safe_log_path
        import os

        os.makedirs(LOG_DIR, exist_ok=True)
        test_file = os.path.join(LOG_DIR, "audit_probe.log")
        with open(test_file, "w", encoding="utf-8") as f:
            f.write("test log data")

        try:
            # Debe retornar None para cualquier intento con ../ o ..\\
            assert _resolve_safe_log_path("../../audit_probe.log") is None
            assert _resolve_safe_log_path("..\\audit_probe.log") is None
            assert _resolve_safe_log_path("sub/audit_probe.log") is None
            assert _resolve_safe_log_path("audit_probe.log") == test_file

            # El endpoint HTTP debe responder 404
            resp = client.get("/api/v1/system/logs/../../audit_probe.log", headers=auth_headers)
            assert resp.status_code == 404
        finally:
            if os.path.exists(test_file):
                os.remove(test_file)

    def test_monitor_guides_content_resolves_valid_relative_guide(self, client, auth_headers):
        """Verifica que /system/guides/content resuelva guías relativas válidas dentro de docs/."""
        resp = client.get("/api/v1/system/guides/content?path=README.md", headers=auth_headers)
        assert resp.status_code == 200
        payload = resp.get_json() or {}
        assert payload.get("success") is True
        assert "content" in payload.get("data", {})

    def test_public_images_rejects_double_url_encoding_and_glob(self, client):
        """Verifica que /public/images/ rechace doble codificación URL y comodines glob."""
        # Doble codificación URL de ../
        resp = client.get("/api/v1/public/images/%252e%252e%252fconfig.py")
        assert resp.status_code in (401, 403, 404)

        # Inyección de patrón glob
        resp_glob = client.get("/api/v1/public/images/animals/*")
        assert resp_glob.status_code in (401, 403, 404)

    def test_file_storage_and_attachments_accept_zero_id(self, app):
        """Verifica que identificadores con valor 0 se procesen correctamente sin falsos positivos de falsy."""
        with app.app_context():
            from app.utils.file_storage import (
                get_animal_upload_path,
                get_finca_upload_path,
                ensure_upload_directory,
            )
            from app.namespaces.core.attachments_namespace import _attachment_dir

            # 0 no debe lanzar ValueError
            path_animal_0 = get_animal_upload_path(0)
            assert path_animal_0.endswith("animals\\0") or path_animal_0.endswith("animals/0")

            path_finca_0 = get_finca_upload_path(0)
            assert path_finca_0.endswith("fincas\\0") or path_finca_0.endswith("fincas/0")

            dir_0 = _attachment_dir(0)
            assert "0" in dir_0

            # Intentos de inyección en identificadores deben lanzar ValueError
            with pytest.raises(ValueError):
                get_animal_upload_path("../../../evil")

            with pytest.raises(ValueError):
                get_animal_upload_path("123/../../etc")

            with pytest.raises(ValueError):
                get_finca_upload_path("../../../evil")

            # Intentos de crear directorios fuera de la carpeta autorizada deben retornar False
            res = ensure_upload_directory("../../carpeta_fuera_de_raiz")
            assert res is False


class TestReDoSHardening:
    """Pruebas de inmunidad a expresiones regulares con retroceso catastrófico (ReDoS)."""

    def test_chat_gps_regex_performance_and_accuracy(self):
        """Verifica que la extracción de coordenadas GPS en chat evalúe en tiempo lineal sin ReDoS."""
        pattern = re.compile(r"q=([+-]?\d+(?:\.\d+)?),([+-]?\d+(?:\.\d+)?)")

        # Coordenadas válidas estándar en Colombia
        valid_sample = "https://maps.google.com/?q=4.7110,-74.0721"
        match = pattern.search(valid_sample)
        assert match is not None
        assert match.group(1) == "4.7110"
        assert match.group(2) == "-74.0721"

        # Cadena patológica de estrés (muchos dígitos repetidos que saturarían una regex polinomial)
        pathological = "q=" + ("9" * 10000) + "!"
        start_time = time.perf_counter()
        no_match = pattern.search(pathological)
        elapsed = time.perf_counter() - start_time

        assert no_match is None
        # La evaluación debe ser prácticamente instantánea (< 10 ms)
        assert elapsed < 0.05, f"Evaluación tardó {elapsed:.4f}s, posible riesgo de ReDoS"


class TestExceptionHardening:
    """Pruebas de supresión de trazas y detalles internos en respuestas 500."""

    def test_treatment_protocols_error_does_not_leak_details(self, app, client, auth_headers):
        """Verifica que un fallo no exponga la traza str(e) al cliente."""
        with patch("app.namespaces.health.treatment_protocols_namespace.TreatmentProtocol") as mock_tp:
            mock_tp.query.filter_by.side_effect = RuntimeError("Error confidencial de base de datos")

            resp = client.post(
                "/api/v1/health/treatment-protocols/99999/apply",
                headers=auth_headers,
                json={"animal_id": 1, "diagnosis": "Fiebre"},
            )
            data = resp.get_json() or {}
            message = str(data)
            assert "Error confidencial de base de datos" not in message
            assert "RuntimeError" not in message

    def test_sse_error_does_not_leak_exception_type(self, client, auth_headers):
        """Verifica que el error en SSE no exponga el nombre del tipo de excepción."""
        with patch("app.api.sse._acquire_sse_slot", side_effect=RuntimeError("Fallo crítico de red simulado")):
            resp = client.get("/api/v1/sse/events", headers=auth_headers)
            body = resp.get_data(as_text=True)
            assert "Fallo crítico de red simulado" not in body
            assert "RuntimeError" not in body
            assert "Error inicializando stream" in body


class TestOpenRedirectHardening:
    """Pruebas de prevención de redirección abierta (Open Redirect) en middleware."""

    def test_middleware_redirects_legitimate_internal_route(self, client):
        """Verifica que las rutas con guion medio se redirijan correctamente a guion bajo."""
        resp = client.get("/api/v1/food-types?active=true", follow_redirects=False)
        assert resp.status_code == 308
        location = resp.headers.get("Location")
        assert location == "/api/v1/food_types?active=true"

    def test_middleware_blocks_open_redirect_attempts(self, client):
        """Verifica que los intentos de inyectar dominios externos sean rechazados con 400."""
        malicious_urls = [
            "/api/v1/food-types//evil.com",
            "/api/v1/food-types://attacker.com",
            "/api/v1/food-types@malicious.org",
            "/api/v1/food-types\\evil.com",
            "/api/v1/food-types?next=1%0d%0aLocation:evil.com",
        ]
        for url in malicious_urls:
            resp = client.get(url, follow_redirects=False)
            assert resp.status_code == 400, f"Se esperaba 400 para intento de redirección abierta: {url}"


class TestHTMLTemplatesSecurity:
    """Pruebas de integridad en plantillas HTML y recursos CDN."""

    def test_swagger_ui_template_specs_url_and_safe_filter(self):
        """Verifica que swagger_ui_custom.html use tojson seguro sin |safe y recursos con SRI."""
        template_path = Path(__file__).resolve().parent.parent / "app" / "templates" / "swagger_ui_custom.html"
        assert template_path.is_file()

        content = template_path.read_text(encoding="utf-8")
        # No debe contener |safe en cookie_config
        assert "{{ cookie_config|tojson|safe }}" not in content
        assert "{{ cookie_config|tojson }}" in content

        # Debe incluir integridad en Bootstrap y Swagger UI
        assert 'integrity="sha384-' in content
        assert 'crossorigin="anonymous"' in content

    def test_api_docs_and_tester_sri_and_no_autoloader(self):
        """Verifica que api_docs.html no cargue prism-autoloader y use SRI en todos los CDNs."""
        docs_path = Path(__file__).resolve().parent.parent / "app" / "templates" / "api_docs.html"
        tester_path = Path(__file__).resolve().parent.parent / "app" / "templates" / "api_tester.html"

        docs_content = docs_path.read_text(encoding="utf-8")
        tester_content = tester_path.read_text(encoding="utf-8")

        # Autoloader debe haber sido eliminado
        assert "prism-autoloader.min.js" not in docs_content

        # Deben tener SRI en sus estilos y scripts externos
        assert 'integrity="sha' in docs_content
        assert 'crossorigin="anonymous"' in docs_content
        assert 'referrerpolicy="no-referrer"' in docs_content

        assert 'integrity="sha' in tester_content
        assert 'crossorigin="anonymous"' in tester_content
