import pytest
import flask
import gzip
from io import BytesIO
from app.utils.compression import init_compression

@pytest.fixture
def comp_app():
    app = flask.Flask("test_compression_app")
    app.config["TESTING"] = True
    app.config["COMPRESS_MIN_SIZE"] = 10  # Tamaño mínimo bajo para pruebas
    init_compression(app)

    @app.route("/json")
    def get_json():
        # Retorna un JSON largo para superar el límite
        return flask.jsonify({"data": "A" * 50})

    @app.route("/short")
    def get_short():
        # Retorna algo menor que COMPRESS_MIN_SIZE (10 bytes)
        return flask.jsonify({"ok": True})  # aprox 11 bytes, pongamos string corto

    @app.route("/short-text")
    def get_short_text():
        # Solo 2 bytes
        return "ok"

    @app.route("/no-zip-type")
    def no_zip_type():
        # Tipo de contenido que no debe comprimirse
        resp = flask.make_response("B" * 50)
        resp.mimetype = "image/png"
        return resp

    return app

@pytest.mark.critical
def test_compression_gzip_applied(comp_app):
    client = comp_app.test_client()
    # Petición aceptando gzip
    resp = client.get("/json", headers={"Accept-Encoding": "gzip"})

    assert resp.status_code == 200
    assert resp.headers.get("Content-Encoding") == "gzip"
    assert "Accept-Encoding" in resp.headers.get("Vary", "")

    # Descomprimir y verificar contenido
    buf = BytesIO(resp.data)
    with gzip.GzipFile(fileobj=buf, mode="rb") as gz:
        decoded_data = gz.read().decode("utf-8")
    assert '"data"' in decoded_data

@pytest.mark.critical
def test_compression_gzip_not_accepted(comp_app):
    client = comp_app.test_client()
    # Petición sin header Accept-Encoding
    resp = client.get("/json")

    assert resp.status_code == 200
    assert resp.headers.get("Content-Encoding") is None
    assert "data" in resp.get_json()

@pytest.mark.critical
def test_compression_ignored_for_short_responses(comp_app):
    client = comp_app.test_client()
    # Petición con gzip pero contenido de 2 bytes (menor a COMPRESS_MIN_SIZE=10)
    resp = client.get("/short-text", headers={"Accept-Encoding": "gzip"})

    assert resp.status_code == 200
    assert resp.headers.get("Content-Encoding") is None
    assert resp.data.decode("utf-8") == "ok"

@pytest.mark.critical
def test_compression_ignored_for_different_mimetypes(comp_app):
    client = comp_app.test_client()
    # mimetype es image/png, no debe comprimirse aunque sea largo y pida gzip
    resp = client.get("/no-zip-type", headers={"Accept-Encoding": "gzip"})

    assert resp.status_code == 200
    assert resp.headers.get("Content-Encoding") is None
    assert len(resp.data) == 50
