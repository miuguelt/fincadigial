"""Contrato del endpoint público de recepción de errores del frontend."""

import json


def test_client_errors_acepta_reportes_sin_token(client):
    payload = {
        "errors": [
            {
                "message": "Script error",
                "type": "onerror",
                "url": "https://finca.enlinea.sbs/",
                "timestamp": "2026-09-08T01:52:30Z",
            }
        ]
    }
    response = client.post(
        "/api/v1/errors/client",
        data=json.dumps(payload),
        content_type="application/json",
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body.get("success") is True
    assert body.get("count") == 1


def test_client_errors_parsea_beacon_text_plain(client):
    # navigator.sendBeacon envía text/plain: el endpoint debe interpretarlo igual.
    payload = json.dumps({"errors": [{"message": "Beacon", "type": "react"}]})
    response = client.post(
        "/api/v1/errors/client",
        data=payload,
        content_type="text/plain;charset=UTF-8",
    )

    assert response.status_code == 200
    body = response.get_json()
    assert body.get("success") is True
    assert body.get("count") == 1


def test_client_errors_maneja_payload_invalido(client):
    response = client.post("/api/v1/errors/client", data="not-json", content_type="text/plain")

    assert response.status_code == 200
    body = response.get_json()
    assert body.get("success") is True
    assert body.get("count") == 0
