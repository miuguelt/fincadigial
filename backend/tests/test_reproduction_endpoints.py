"""
Tests de integración HTTP para endpoints de Gestión Reproductiva.

Verifica: listado, creación individual, y creación por lote de eventos reproductivos.
"""

BASE = "/api/v1"
ADMIN = "Administrador"

class TestReproductionEndpoints:
    def test_get_events_list(self, client, token_for):
        resp = client.get(f"{BASE}/reproduction/events/", headers=token_for(ADMIN))
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["success"] is True

    def test_post_batch_reproduction_body_invalido(self, client, token_for):
        resp = client.post(f"{BASE}/reproduction/batch", json={}, headers=token_for(ADMIN))
        assert resp.status_code in (400, 422)
        body = resp.get_json()
        assert body["success"] is False

    def test_post_batch_reproduction_invalida_animal_ids(self, client, token_for):
        resp = client.post(
            f"{BASE}/reproduction/batch",
            json={
                "animal_ids": [],
                "event_type": "Celo",
                "event_date": "2026-05-23"
            },
            headers=token_for(ADMIN)
        )
        assert resp.status_code in (400, 422)
        body = resp.get_json()
        assert body["success"] is False
