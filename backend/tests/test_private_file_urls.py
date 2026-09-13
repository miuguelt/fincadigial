from urllib.parse import parse_qs, urlparse

from app.utils.file_storage import get_public_url


def test_upload_url_is_signed_and_required_for_download(app, client, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    file_path = tmp_path / "fincas" / "1" / "private.txt"
    file_path.parent.mkdir(parents=True)
    file_path.write_text("contenido privado", encoding="utf-8")

    with app.test_request_context("/"):
        signed_url = get_public_url("static/uploads/fincas/1/private.txt")

    parsed = urlparse(signed_url)
    signature = parse_qs(parsed.query)["sig"][0]
    signed_path = f"/api/v1/public/images/fincas/1/private.txt?sig={signature}"

    assert client.get("/api/v1/public/images/fincas/1/private.txt").status_code in (401, 403)
    response = client.get(signed_path)
    assert response.status_code == 200
    assert response.data == b"contenido privado"
    assert response.headers["Cache-Control"] == "private, no-store"


def test_upload_signature_cannot_be_replayed_for_another_path(app, client, tmp_path):
    app.config["UPLOAD_FOLDER"] = str(tmp_path)
    file_path = tmp_path / "fincas" / "1" / "private.txt"
    file_path.parent.mkdir(parents=True)
    file_path.write_text("contenido privado", encoding="utf-8")

    with app.test_request_context("/"):
        signed_url = get_public_url("static/uploads/fincas/1/private.txt")

    signature = parse_qs(urlparse(signed_url).query)["sig"][0]
    response = client.get(f"/api/v1/public/images/fincas/1/other.txt?sig={signature}")
    assert response.status_code in (401, 403)
