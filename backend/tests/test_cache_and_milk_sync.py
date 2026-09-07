"""
Tests de integración para cache-busting con timestamp y sincronización de ordeños.
"""

BASE = "/api/v1"
ADMIN = "Administrador"


class TestCacheAndMilkSync:
    def test_cache_bust_timestamp_bypasses_cache(self, client, token_for):
        """Verifica que un timestamp numérico Date.now() en cache_bust omita la caché."""
        timestamp = 1725667890123
        resp = client.get(
            f"{BASE}/animals?cache_bust={timestamp}", headers=token_for(ADMIN)
        )
        assert resp.status_code == 200
        cc = resp.headers.get("Cache-Control", "")
        # Debe forzar revalidación inmediata (no-cache o max-age=0)
        assert "no-cache" in cc or "max-age=0" in cc

    def test_milk_production_get_and_cache_headers(self, client, token_for):
        """Verifica que el endpoint de ordeños responda con headers de revalidación."""
        resp = client.get(f"{BASE}/milk-production", headers=token_for(ADMIN))
        assert resp.status_code == 200
        cc = resp.headers.get("Cache-Control", "")
        assert "no-cache" in cc or "max-age=0" in cc

    def test_post_milk_production_requiere_animal(self, client, token_for):
        """Verifica validación al registrar ordeño sin animal."""
        resp = client.post(
            f"{BASE}/milk-production",
            json={"liters": 12.5, "milking_session": "AM"},
            headers=token_for(ADMIN),
        )
        assert resp.status_code in (400, 422)

    def test_milk_batch_post_sin_finca_o_entradas(self, client, token_for):
        """Verifica endpoint de lote de ordeños."""
        resp = client.post(
            f"{BASE}/milk-production/batch",
            json={"entries": []},
            headers=token_for(ADMIN),
        )
        assert resp.status_code in (400, 422)
